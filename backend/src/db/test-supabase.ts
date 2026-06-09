import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function main() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_ANON_KEY!;
  
  console.log('Testing Supabase connection to chat_sessions table...');
  const supabase = createClient(url, key);
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .limit(1);
    
  console.log('--- ERROR OBJECT ---');
  console.log('Error exists:', !!error);
  console.log('Error keys:', error ? Object.keys(error) : []);
  console.log('Error code:', error?.code);
  console.log('Error message:', error?.message);
  console.log('Error details:', error?.details);
  console.log('Error JSON:', JSON.stringify(error, null, 2));
}

main().catch(console.error);
