import { Client } from 'pg';

async function main() {
  const directUrl = 'postgresql://postgres:rahul%40663456%40@db.uyiktoxzhqlvfrqhudws.supabase.co:5432/postgres';
  console.log('Connecting directly to Supabase DB...');
  const client = new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('Connected! Creating chat_sessions table...');
  
  const sql = `
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT        NOT NULL,
  messages   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
  `;
  
  await client.query(sql);
  console.log('✅ chat_sessions table created successfully!');
  await client.end();
}

main().catch(console.error);
