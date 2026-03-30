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