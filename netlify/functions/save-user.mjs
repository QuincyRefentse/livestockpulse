import { neon } from '@netlify/neon';

// I changed 'event' to 'req' (request) as it's the standard naming convention for this format
export default async (req) => { 
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight (Checks for modern req.method or older req.httpMethod)
  if (req.method === 'OPTIONS' || req.httpMethod === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  let body;
  try {
    // ✨ THE MAGIC FIX: This is how you correctly read JSON in modern Netlify Functions
    body = await req.json(); 
  } catch (error) {
    // Fallback just in case it triggers the older stringified body format
    try {
      body = JSON.parse(req.body);
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON payload!" }),
        { status: 400, headers }
      );
    }
  }

  console.log("Backend correctly parsed body:", body);

  // Extract fields using your original database column names
  const { firstname, surname, age } = body;
  const parsedAge = typeof age === "string" ? Number(age) : age;

  // Validation
  if (!firstname || !surname || typeof parsedAge !== 'number' || isNaN(parsedAge)) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Required field missing.",
        missing: [
          !firstname && 'firstname',
          !surname && 'surname',
          (typeof parsedAge !== 'number' || isNaN(parsedAge)) && 'age'
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
      VALUES (${firstname}, ${surname}, ${parsedAge})
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