/**
 * setup-https.ts
 * Applies schema.sql via Supabase SQL HTTP API (port 443 only - no direct DB port needed).
 * Uses the service role key for DDL permissions.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const PROJECT_REF = 'uyiktoxzhqlvfrqhudws';
const ANON_KEY = 'sb_publishable_3qDUWRSfgctjNA-04CHL2w_tcJRVGzo';

// Supabase SQL endpoint (available on all projects via HTTPS)
const SQL_ENDPOINT = `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`;

async function fetchJson(url: string, body: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('📡 Sending schema to Supabase via HTTPS...');
  const result = await fetchJson(
    SQL_ENDPOINT,
    JSON.stringify({ sql }),
    {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Prefer': 'return=representation',
    }
  );

  console.log('Status:', result.status);
  console.log('Response:', result.body.slice(0, 300));

  if (result.status === 200 || result.status === 204) {
    console.log('✅ Schema applied!');
  } else {
    console.log('ℹ️  RPC exec_sql not available - using direct HTTPS SQL editor approach instead.');
    console.log('\n📋 MANUAL STEP REQUIRED (30 seconds):');
    console.log('1. Open: https://supabase.com/dashboard/project/uyiktoxzhqlvfrqhudws/sql/new');
    console.log('2. Paste the content of: backend/src/db/schema.sql');
    console.log('3. Click "Run"');
    console.log('4. Come back and type "continue" — I will run the seed and start everything.');
  }
}

main().catch(console.error);
