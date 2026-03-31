import { neon } from '@netlify/neon';
import { getStore } from '@netlify/blobs';

export default async (event) => {
  // Add CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers
    });
  }
  
  console.log('=== Function called ===');
  console.log('Method:', event.httpMethod);
  
  let body = event.body;
  
  if (!body) {
    console.error('No body in request');
    return new Response(
      JSON.stringify({ success: false, error: "Missing body!" }),
      { status: 400, headers }
    );
  }
  
  // Parse body if it's a string
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
      console.log('Parsed body fields:', Object.keys(body));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body!" }),
        { status: 400, headers }
      );
    }
  }
  
  // Check for required fields
  const { id, fmd_status, location, imageBase64 } = body;
  
  if (!id || !fmd_status || !location || !imageBase64) {
    console.error('Missing fields:', { 
      hasId: !!id, 
      hasFmd: !!fmd_status, 
      hasLocation: !!location, 
      hasImage: !!imageBase64 
    });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Required field missing.",
        missing: [
          !id && 'id',
          !fmd_status && 'fmd_status',
          !location && 'location',
          !imageBase64 && 'imageBase64'
        ].filter(Boolean)
      }),
      { status: 400, headers }
    );
  }
  
  console.log('Processing animal:', { id, fmd_status, location });
  
  // Clean base64 prefix if present
  let pureBase64 = imageBase64;
  if (pureBase64.startsWith('data:image/png;base64,')) {
    pureBase64 = pureBase64.replace('data:image/png;base64,', '');
    console.log('Removed PNG prefix');
  } else if (pureBase64.startsWith('data:image/jpeg;base64,')) {
    pureBase64 = pureBase64.replace('data:image/jpeg;base64,', '');
    console.log('Removed JPEG prefix');
  }
  
  try {
    // Initialize the blob store
    console.log('Initializing blob store...');
    const store = getStore('qr-codes');
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(pureBase64, 'base64');
    console.log('Image buffer size:', imageBuffer.length, 'bytes');
    
    // Upload to blob store
    const blobKey = `${id}.png`;
    console.log('Uploading to blob:', blobKey);
    await store.set(blobKey, imageBuffer, {
      metadata: { contentType: 'image/png' }
    });
    console.log('Upload successful');
    
    // Construct blob URL
    const qr_blob_url = `/.netlify/blobs/qr-codes/${blobKey}`;
    
    // Use Neon to insert into database
    console.log('Connecting to Neon database...');
    const sql = neon();
    const scan_time = new Date().toISOString();
    
    console.log('Inserting record...');
    const [animal] = await sql`
      INSERT INTO animals (id, qr_blob_url, fmd_status, location, scan_time)
      VALUES (${id}, ${qr_blob_url}, ${fmd_status}, ${location}, ${scan_time})
      RETURNING *;
    `;
    
    console.log('Database insert successful:', animal.id);
    
    return new Response(
      JSON.stringify({ success: true, animal }),
      { status: 201, headers }
    );
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      { status: 500, headers }
    );
  }
};



/*
import { neon } from '@netlify/neon';
import { getStore } from '@netlify/blobs';

export default async (event) => {
  // Add CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers
    });
  }
  
  // Log the incoming request details for debugging
  console.log('Request method:', event.httpMethod);
  console.log('Request headers:', JSON.stringify(event.headers));
  console.log('Request body type:', typeof event.body);
  
  let body = event.body;
  
  // Handle different ways the body might be passed
  if (!body) {
    console.error('No body in request');
    return new Response(
      JSON.stringify({ success: false, error: "Missing body!" }),
      { status: 400, headers }
    );
  }
  
  // Parse body if it's a string
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
      console.log('Parsed body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw body:', body);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body!", details: parseError.message }),
        { status: 400, headers }
      );
    }
  }
  
  // Check for required fields
  const { id, fmd_status, location, imageBase64 } = body;
  console.log('Extracted fields:', { id, fmd_status, location, hasImage: !!imageBase64 });
  
  const missingFields = [];
  if (!id) missingFields.push('id');
  if (!fmd_status) missingFields.push('fmd_status');
  if (!location) missingFields.push('location');
  if (!imageBase64) missingFields.push('imageBase64');
  
  if (missingFields.length > 0) {
    console.error('Missing fields:', missingFields);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Required field missing.", 
        missing: missingFields 
      }),
      { status: 400, headers }
    );
  }

  // Clean base64 prefix if present
  let pureBase64 = imageBase64;
  if (pureBase64.startsWith('data:image/png;base64,')) {
    pureBase64 = pureBase64.replace('data:image/png;base64,', '');
    console.log('Removed base64 prefix, new length:', pureBase64.length);
  } else if (pureBase64.startsWith('data:image/jpeg;base64,')) {
    pureBase64 = pureBase64.replace('data:image/jpeg;base64,', '');
    console.log('Removed JPEG base64 prefix');
  }

  try {
    // Initialize the blob store
    console.log('Initializing blob store...');
    const store = getStore('qr-codes');
    
    // Convert base64 to buffer
    console.log('Converting base64 to buffer...');
    const imageBuffer = Buffer.from(pureBase64, 'base64');
    console.log('Buffer size:', imageBuffer.length, 'bytes');
    
    // Upload to blob store
    console.log(`Uploading to blob store: ${id}.png`);
    await store.set(`${id}.png`, imageBuffer, {
      metadata: { contentType: 'image/png' }
    });
    console.log('Upload successful');
    
    // Construct blob URL
    const qr_blob_url = `/.netlify/blobs/qr-codes/${id}.png`;
    console.log('Blob URL:', qr_blob_url);

    // Use Neon to insert
    console.log('Connecting to Neon database...');
    const sql = neon();
    const scan_time = new Date().toISOString();
    console.log('Inserting into database:', { id, qr_blob_url, fmd_status, location, scan_time });
    
    const [animal] = await sql`
      INSERT INTO animals (id, qr_blob_url, fmd_status, location, scan_time)
      VALUES (${id}, ${qr_blob_url}, ${fmd_status}, ${location}, ${scan_time})
      RETURNING *;
    `;
    
    console.log('Database insert successful:', animal);

    return new Response(
      JSON.stringify({ success: true, animal }),
      { status: 201, headers }
    );
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack
      }),
      { status: 500, headers }
    );
  }
};


*/


/*
import { neon } from '@netlify/neon';
import { getStore } from '@netlify/blobs';

export default async (event) => {
  // Log the incoming request details for debugging
  console.log('Request method:', event.httpMethod);
  console.log('Request headers:', JSON.stringify(event.headers));
  console.log('Request body type:', typeof event.body);
  
  let body = event.body;
  
  // Handle different ways the body might be passed
  if (!body) {
    console.error('No body in request');
    return new Response(
      JSON.stringify({ success: false, error: "Missing body!" }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }
  
  // Parse body if it's a string
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
      console.log('Parsed body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw body:', body);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body!", details: parseError.message }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }
  }
  
  // Check for required fields
  const { id, fmd_status, location, imageBase64 } = body;
  console.log('Extracted fields:', { id, fmd_status, location, hasImage: !!imageBase64 });
  
  const missingFields = [];
  if (!id) missingFields.push('id');
  if (!fmd_status) missingFields.push('fmd_status');
  if (!location) missingFields.push('location');
  if (!imageBase64) missingFields.push('imageBase64');
  
  if (missingFields.length > 0) {
    console.error('Missing fields:', missingFields);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Required field missing.", 
        missing: missingFields 
      }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  // Clean base64 prefix if present
  let pureBase64 = imageBase64;
  if (pureBase64.startsWith('data:image/png;base64,')) {
    pureBase64 = pureBase64.replace('data:image/png;base64,', '');
    console.log('Removed base64 prefix, new length:', pureBase64.length);
  } else if (pureBase64.startsWith('data:image/jpeg;base64,')) {
    pureBase64 = pureBase64.replace('data:image/jpeg;base64,', '');
    console.log('Removed JPEG base64 prefix');
  }

  try {
    // Initialize the blob store
    console.log('Initializing blob store...');
    const store = getStore('qr-codes');
    
    // Convert base64 to buffer
    console.log('Converting base64 to buffer...');
    const imageBuffer = Buffer.from(pureBase64, 'base64');
    console.log('Buffer size:', imageBuffer.length, 'bytes');
    
    // Upload to blob store
    console.log(`Uploading to blob store: ${id}.png`);
    await store.set(`${id}.png`, imageBuffer, {
      metadata: { contentType: 'image/png' }
    });
    console.log('Upload successful');
    
    // Construct blob URL
    const qr_blob_url = `/.netlify/blobs/qr-codes/${id}.png`;
    console.log('Blob URL:', qr_blob_url);

    // Use Neon to insert
    console.log('Connecting to Neon database...');
    const sql = neon();
    const scan_time = new Date().toISOString();
    console.log('Inserting into database:', { id, qr_blob_url, fmd_status, location, scan_time });
    
    const [animal] = await sql`
      INSERT INTO animals (id, qr_blob_url, fmd_status, location, scan_time)
      VALUES (${id}, ${qr_blob_url}, ${fmd_status}, ${location}, ${scan_time})
      RETURNING *;
    `;
    
    console.log('Database insert successful:', animal);

    return new Response(
      JSON.stringify({ success: true, animal }),
      { status: 201, headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};


*/










/*

import { neon } from '@netlify/neon';
import { getStore } from '@netlify/blobs';

export default async (event) => {
  let body = event.body;
  if (!body) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing body!" }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body!" }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }
  }
  const { id, fmd_status, location, imageBase64 } = body;
  if (!id || !fmd_status || !location || !imageBase64) {
    return new Response(
      JSON.stringify({ success: false, error: "Required field missing." }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  // Clean base64 prefix if present
  let pureBase64 = imageBase64;
  if (pureBase64.startsWith('data:image/png;base64,')) {
    pureBase64 = pureBase64.replace('data:image/png;base64,', '');
  }

  try {
    // Initialize the blob store
    const store = getStore('qr-codes');
    
    // Convert base64 to buffer and upload to Netlify Blob
    const imageBuffer = Buffer.from(pureBase64, 'base64');
    await store.set(`${id}.png`, imageBuffer, {
      metadata: { contentType: 'image/png' }
    });
    
    // Get the blob URL (you'll need to construct this based on your site)
    const qr_blob_url = `/.netlify/blobs/qr-codes/${id}.png`;

    // Use Neon to insert!
    const sql = neon();
    const scan_time = new Date().toISOString();
    const [animal] = await sql`
      INSERT INTO animals (id, qr_blob_url, fmd_status, location, scan_time)
      VALUES (${id}, ${qr_blob_url}, ${fmd_status}, ${location}, ${scan_time})
      RETURNING *;
    `;

    return new Response(
      JSON.stringify({ success: true, animal }),
      { status: 201, headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};

*/






/*


import { neon } from '@netlify/neon';
//import { blobs } from '@netlify/blobs';
import blobs from '@netlify/blobs';

export default async (event) => {
  let body = event.body;
  if (!body) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing body!" }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body!" }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }
  }
  const { id, fmd_status, location, imageBase64 } = body;
  if (!id || !fmd_status || !location || !imageBase64) {
    return new Response(
      JSON.stringify({ success: false, error: "Required field missing." }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  // Clean base64 prefix if present
  let pureBase64 = imageBase64;
  if (pureBase64.startsWith('data:image/png;base64,')) {
    pureBase64 = pureBase64.replace('data:image/png;base64,', '');
  }

  try {
    // Upload image to Netlify Blob (no prefix)
    const { url: qr_blob_url } = await blobs.upload(
      `qr-codes/${id}.png`,
      pureBase64,
      { contentType: 'image/png', encoding: 'base64' }
    );

    // Use Neon to insert!
    const sql = neon();
    const scan_time = new Date().toISOString();
    const [animal] = await sql`
      INSERT INTO animals (id, qr_blob_url, fmd_status, location, scan_time)
      VALUES (${id}, ${qr_blob_url}, ${fmd_status}, ${location}, ${scan_time})
      RETURNING *;
    `;

    return new Response(
      JSON.stringify({ success: true, animal }),
      { status: 201, headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};




*/

/*

import { neon } from '@netlify/neon';
import { blobs } from '@netlify/blobs';

export default async (event) => {
  let body = event.body;
  if (typeof body === 'string') {
    body = JSON.parse(body);
  }
  const { id, fmd_status, location, imageBase64 } = body;

  // Upload image to Netlify Blob
  const { url: qr_blob_url } = await blobs.upload(
    `qr-codes/${id}.png`,
    imageBase64,
    { contentType: 'image/png' }
  );

  // Use Netlify/Neon package for DB
  const sql = neon(); // It will use process.env.NETLIFY_DATABASE_URL automatically
  try {
    const scan_time = new Date().toISOString();
    // Insert the record
    const [animal] = await sql`
      INSERT INTO animals (id, qr_blob_url, fmd_status, location, scan_time)
      VALUES (${id}, ${qr_blob_url}, ${fmd_status}, ${location}, ${scan_time})
      RETURNING *;
    `;

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, animal }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};

*/

/*
import { Client } from "pg";
import { blob } from '@netlify/blobs';

export default async (event) => {
  let body = event.body;
  if (typeof body === 'string') {
    body = JSON.parse(body);
  }
  const { id, fmd_status, location, imageBase64 } = body;

  // Upload image to Netlify Blob
  const { url: qr_blob_url } = await blob.upload(
    `qr-codes/${id}.png`,
    imageBase64,
    { contentType: 'image/png' }
  );

  // Store the record in Neon (Postgres) database
  const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL });
  try {
    await client.connect();
    const scan_time = new Date().toISOString();

    const insertQuery = `
      INSERT INTO animals (id, qr_blob_url, fmd_status, location, scan_time)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [id, qr_blob_url, fmd_status, location, scan_time];
    const res = await client.query(insertQuery, values);

    await client.end();

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, animal: res.rows[0] }),
    };
  } catch (error) {
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};

*/


/*

// netlify/functions/save-animal.js

import { Client } from "pg";
import { blob } from '@netlify/blobs';

export default async (event) => {
  const { id, fmd_status, location, imageBase64 } = JSON.parse(event.body);

  // Upload image to Netlify Blob
  const { url: qr_blob_url } = await blob.upload(
    `qr-codes/${id}.png`,
    imageBase64,
    { contentType: 'image/png' }
  );

  // Store the record in Neon (Postgres) database
  const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL });
  try {
    await client.connect();
    const scan_time = new Date().toISOString();

    // Insert the record into the animals table
    const insertQuery = `
      INSERT INTO animals (id, qr_blob_url, fmd_status, location, scan_time)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [id, qr_blob_url, fmd_status, location, scan_time];
    const res = await client.query(insertQuery, values);

    await client.end();

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, animal: res.rows[0] }),
    };
  } catch (error) {
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};


*/

/*
import { db } from '@netlify/database';
import { blob } from '@netlify/blobs';

export default async (event) => {
  const { id, fmd_status, location, imageBase64 } = JSON.parse(event.body);
  // Upload image to Netlify Blob
  const { url: qr_blob_url } = await blob.upload(`qr-codes/${id}.png`, imageBase64, { contentType: 'image/png' });

  // Store the record to database
  const record = await db.table('animals').create({
    id, qr_blob_url, fmd_status, location, scan_time: new Date().toISOString()
  });
  return { statusCode: 201, body: JSON.stringify({ success: true, animal: record }) };
};

*/