import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function main() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_ANON_KEY!;

  console.log('Testing Supabase connection to customers table...');
  const supabase = createClient(url, key);

  const { data, error, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Total customers count:', count);
    console.log('Sample customer:', data);
  }
}

main().catch(console.error);
