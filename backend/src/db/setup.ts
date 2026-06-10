import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function runSchema(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  console.log('Connecting to Supabase...');
  const client = await pool.connect();

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema...');
    await client.query(sql);
    console.log(' Schema applied successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

runSchema().catch((err) => {
  console.error(' Schema failed:', err.message);
  process.exit(1);
});
