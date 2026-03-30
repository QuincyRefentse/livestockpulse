import { neon } from '@netlify/neon';
import { blobs } from '@netlify/blobs';

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