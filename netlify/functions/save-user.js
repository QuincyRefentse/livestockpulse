import { neon } from '@netlify/neon';

export default async (event) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  let body = event.body;
  if (!body) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing body!" }),
      { status: 400, headers }
    );
  }
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body!" }),
        { status: 400, headers }
      );
    }
  }

  // extract fields
  const { firstname, surname, age } = body;
  if (!firstname || !surname || typeof age !== 'number') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Required field missing.",
        missing: [
          !firstname && 'firstname',
          !surname && 'surname',
          (typeof age !== 'number') && 'age'
        ].filter(Boolean)
      }),
      { status: 400, headers }
    );
  }

  try {
    // connect Neon & insert
    const sql = neon();
    const [user] = await sql`
      INSERT INTO users (firstname, surname, age)
      VALUES (${firstname}, ${surname}, ${age})
      RETURNING *;
    `;
    return new Response(
      JSON.stringify({ success: true, user }),
      { status: 201, headers }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers }
    );
  }
};