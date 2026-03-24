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