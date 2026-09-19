const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.ocshvyfuolkymliquygz:j.H5S3JET%25mY*38@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("Tables:");
    console.table(res.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
