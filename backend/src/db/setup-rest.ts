import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://uyiktoxzhqlvfrqhudws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3qDUWRSfgctjNA-04CHL2w_tcJRVGzo';

async function runSchemaViaRPC(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const statements = schemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(` ${statements.length} SQL statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt.trim()) continue;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ sql: stmt }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn(`️  Statement ${i + 1} warning: ${err.slice(0, 100)}`);
    } else {
      process.stdout.write('.');
    }
  }

  console.log('\n Schema run complete!');
}

runSchemaViaRPC().catch((err: Error) => {
  console.error('Schema via RPC failed:', err.message);
  process.exit(1);
});
