import { neon } from '@netlify/neon';

export default async () => {
  try {
    const sql = neon();
    const [{ test_value }] = await sql`SELECT 42 as test_value;`;
    return new Response(
      JSON.stringify({ message: 'DB connection and SELECT works!', test_value }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'DB test failed', error: error.message }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};