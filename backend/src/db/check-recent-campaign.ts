import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function main() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key);

  console.log('Fetching most recent campaign...');

  const { data: campaigns, error: campErr } = await supabase
    .from('campaigns')
    .select('id, name, status, launched_at, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (campErr) {
    console.error('Error fetching campaigns:', campErr.message);
    return;
  }

  const campaign = campaigns?.[0];
  if (!campaign) {
    console.log('No campaigns found.');
    return;
  }

  console.log('Most Recent Campaign:', campaign);

  const { data: comms, error: commsErr } = await supabase
    .from('communications')
    .select('status')
    .eq('campaign_id', campaign.id);

  if (commsErr) {
    console.error('Error fetching communications:', commsErr.message);
    return;
  }

  const statusCounts: Record<string, number> = {};
  for (const c of comms ?? []) {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
  }

  console.log('Communications Count:', comms?.length);
  console.log('Communications Status Counts:', statusCounts);
}

main().catch(console.error);
