import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('🚀 Creating Summer Cold Brew Launch demo campaign...');

  // 1. Get a segment ID (e.g. High Spenders)
  const { data: segment } = await supabase
    .from('segments')
    .select('id')
    .eq('name', 'High Spenders')
    .single();

  if (!segment) {
    console.error('Could not find High Spenders segment to link.');
    process.exit(1);
  }

  // 2. Create the campaign
  const campaignData = {
    name: 'Summer Cold Brew Launch',
    segment_id: segment.id,
    channel: 'whatsapp',
    message_template: 'Hey {{name}}! ☀️ Beat the heat with our new Summer Cold Brew. Enjoy 15% off at any BrewCo outlet today!',
    status: 'completed',
    launched_at: new Date().toISOString(), // Today!
  };

  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .insert(campaignData)
    .select()
    .single();

  if (campErr) {
    console.error('Failed to create campaign:', campErr.message);
    process.exit(1);
  }

  console.log(`Campaign created successfully with ID: ${campaign.id}`);

  // 3. Create campaign stats
  const totalAudience = 65;
  const stats = {
    campaign_id: campaign.id,
    total: totalAudience,
    sent: totalAudience,
    delivered: 61,
    failed: 4,
    opened: 48,
    read_count: 36,
    clicked: 18,
    orders_attributed: 5,
    updated_at: new Date().toISOString(),
  };

  const { error: statsErr } = await supabase
    .from('campaign_stats')
    .insert(stats);

  if (statsErr) {
    console.error('Failed to create campaign stats:', statsErr.message);
    process.exit(1);
  }

  console.log('Campaign stats created successfully.');

  // 4. Create communication logs for 65 random customers
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .limit(totalAudience);

  if (!customers || customers.length === 0) {
    console.error('No customers found to log communications.');
    process.exit(1);
  }

  const communications = [];
  const launchTime = new Date();

  for (let i = 0; i < Math.min(customers.length, totalAudience); i++) {
    const cust = customers[i];
    let status: 'failed' | 'delivered' | 'opened' | 'read' | 'clicked' = 'delivered';

    if (i < stats.failed) {
      status = 'failed';
    } else if (i < stats.failed + stats.clicked) {
      status = 'clicked';
    } else if (i < stats.failed + stats.clicked + stats.read_count) {
      status = 'read';
    } else if (i < stats.failed + stats.clicked + stats.read_count + stats.opened) {
      status = 'opened';
    }

    const sentAt = new Date(launchTime.getTime() - i * 30000); // spread over last 30 minutes
    const deliveredAt = status !== 'failed' ? new Date(sentAt.getTime() + 1000) : null;
    const openedAt = ['opened', 'read', 'clicked'].includes(status) ? new Date(deliveredAt!.getTime() + 5000) : null;
    const readAt = ['read', 'clicked'].includes(status) ? new Date(openedAt!.getTime() + 2000) : null;
    const clickedAt = status === 'clicked' ? new Date(readAt!.getTime() + 1500) : null;

    communications.push({
      campaign_id: campaign.id,
      customer_id: cust.id,
      message: campaignData.message_template.replace('{{name}}', cust.name),
      status,
      sent_at: sentAt.toISOString(),
      delivered_at: deliveredAt?.toISOString() ?? null,
      opened_at: openedAt?.toISOString() ?? null,
      read_at: readAt?.toISOString() ?? null,
      clicked_at: clickedAt?.toISOString() ?? null,
      updated_at: (clickedAt || readAt || openedAt || deliveredAt || sentAt).toISOString(),
    });
  }

  // Bulk insert communications
  const { error: commsErr } = await supabase
    .from('communications')
    .insert(communications);

  if (commsErr) {
    console.error('Failed to insert communication logs:', commsErr.message);
    process.exit(1);
  }

  console.log(`✅ Demo campaign successfully created with ${communications.length} log entries!`);
  process.exit(0);
}

main().catch(console.error);
