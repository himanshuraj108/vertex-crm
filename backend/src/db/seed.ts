import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'];
const GENDERS = ['male', 'female', 'other'];
const FIRST_NAMES = ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan','Aadhya','Ananya','Diya','Pari','Kavya','Ishita','Aanya','Riya','Neha','Pooja','Rohan','Karan','Amit','Priya','Shruti','Rahul','Sneha','Vikram','Meera','Rajesh'];
const LAST_NAMES = ['Sharma','Verma','Singh','Gupta','Patel','Kumar','Mehta','Joshi','Nair','Reddy','Shah','Agarwal','Tiwari','Pandey','Rao','Iyer','Pillai','Menon','Bose','Das'];
const ITEMS = [
  { name: 'Espresso', price: 180 },
  { name: 'Cappuccino', price: 220 },
  { name: 'Cold Brew', price: 260 },
  { name: 'Matcha Latte', price: 280 },
  { name: 'Flat White', price: 240 },
  { name: 'Americano', price: 190 },
  { name: 'Croissant', price: 150 },
  { name: 'Cheesecake', price: 320 },
  { name: 'Blueberry Muffin', price: 140 },
  { name: 'Avocado Toast', price: 380 },
];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString(); }

async function seed() {
  console.log('🌱 Seeding Vertex CRM database via Supabase...\n');

  console.log('🧹 Clearing existing database tables...');
  try {
    await supabase.from('communications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('campaign_stats').delete().neq('campaign_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('segments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('  ✅ Database cleared');
  } catch (err: any) {
    console.warn('  ⚠️ Database clearing warning:', err.message);
  }

  // ─── Customers ──────────────────────────────────────────────────────────────
  console.log('👥 Creating 100 customers...');
  const customers = Array.from({ length: 100 }, (_, i) => {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const city = pick(CITIES);
    const gender = pick(GENDERS);
    const orderCount = rand(1, 20);
    const spend = rand(500, 50000);
    return {
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      phone: `+91${rand(7000000000, 9999999999)}`,
      city,
      gender,
      total_spend: spend,
      order_count: orderCount,
      visit_count: orderCount + rand(0, 5),
      last_order_at: daysAgo(rand(1, 180)),
      tags: [] as string[],
    };
  });

  const { data: insertedCustomers, error: custErr } = await supabase
    .from('customers')
    .insert(customers)
    .select('id,name,total_spend,order_count');
  if (custErr) { console.error('Customer seed failed:', custErr.message); process.exit(1); }
  console.log(`  ✅ ${insertedCustomers?.length} customers created`);

  // ─── Orders ────────────────────────────────────────────────────────────────
  console.log('📦 Creating ~500 orders...');
  const orders = [];
  for (const cust of (insertedCustomers ?? [])) {
    const numOrders = rand(1, 8);
    for (let j = 0; j < numOrders; j++) {
      const numItems = rand(1, 3);
      const items = Array.from({ length: numItems }, () => {
        const item = pick(ITEMS);
        return { name: item.name, qty: rand(1, 2), price: item.price };
      });
      const amount = items.reduce((s, i) => s + i.qty * i.price, 0);
      orders.push({
        customer_id: cust.id,
        amount,
        items,
        channel: pick(['online', 'offline', 'app'] as const),
        status: 'completed',
        ordered_at: daysAgo(rand(1, 180)),
      });
    }
  }

  const batchSize = 100;
  for (let i = 0; i < orders.length; i += batchSize) {
    const { error } = await supabase.from('orders').insert(orders.slice(i, i + batchSize));
    if (error) console.warn('  ⚠️ Order batch error:', error.message);
  }
  console.log(`  ✅ ~${orders.length} orders created`);

  // ─── Segments ──────────────────────────────────────────────────────────────
  console.log('🎯 Creating 8 segments...');
  const segments = [
    { name: 'High Spenders', description: 'Customers who spent over ₹10,000', rules: { logic: 'AND', conditions: [{ field: 'total_spend', operator: 'gt', value: 10000 }] }, audience_size: 0, ai_generated: false },
    { name: 'Churning Customers', description: 'No order in 60+ days', rules: { logic: 'AND', conditions: [{ field: 'days_since_last_order', operator: 'gt', value: 60 }] }, audience_size: 0, ai_generated: false },
    { name: 'New Customers', description: 'Made only 1-2 orders', rules: { logic: 'AND', conditions: [{ field: 'order_count', operator: 'lte', value: 2 }] }, audience_size: 0, ai_generated: false },
    { name: 'Mumbai VIPs', description: 'Mumbai customers spending over ₹5,000', rules: { logic: 'AND', conditions: [{ field: 'city', operator: 'eq', value: 'Mumbai' }, { field: 'total_spend', operator: 'gt', value: 5000 }] }, audience_size: 0, ai_generated: false },
    { name: 'Frequent Visitors', description: 'More than 10 visits', rules: { logic: 'AND', conditions: [{ field: 'visit_count', operator: 'gt', value: 10 }] }, audience_size: 0, ai_generated: false },
    { name: 'Re-engagement Targets', description: 'Inactive 30d+ with spend > ₹2000', rules: { logic: 'AND', conditions: [{ field: 'days_since_last_order', operator: 'gt', value: 30 }, { field: 'total_spend', operator: 'gt', value: 2000 }] }, audience_size: 0, ai_generated: false },
    { name: 'Loyal Regulars', description: 'More than 5 orders', rules: { logic: 'AND', conditions: [{ field: 'order_count', operator: 'gt', value: 5 }] }, audience_size: 0, ai_generated: false },
    { name: 'First-Time Buyers', description: 'Exactly 1 order', rules: { logic: 'AND', conditions: [{ field: 'order_count', operator: 'eq', value: 1 }] }, audience_size: 0, ai_generated: false },
  ];

  // Estimate audience sizes from inserted customers
  for (const seg of segments) {
    const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true })
      .gte('total_spend', (seg.rules as { conditions: Array<{ field: string; operator: string; value: number }> }).conditions.find(c => c.field === 'total_spend')?.value ?? 0);
    seg.audience_size = count ?? Math.floor(Math.random() * 30) + 5;
  }

  const { data: insertedSegs, error: segErr } = await supabase.from('segments').insert(segments).select('id,name');
  if (segErr) { console.error('Segment seed failed:', segErr.message); process.exit(1); }
  console.log(`  ✅ ${insertedSegs?.length} segments created`);

  // ─── Campaigns ─────────────────────────────────────────────────────────────
  console.log('📢 Creating 5 campaigns...');
  const segIds = insertedSegs?.map(s => s.id) ?? [];
  const campaigns = [
    { name: 'Monsoon Re-engagement', segment_id: segIds[1], channel: 'whatsapp', message_template: 'Hi {{name}}, we miss you at BrewCo! Come back for a warm cup this monsoon. ☕', status: 'completed', launched_at: daysAgo(15) },
    { name: 'VIP Exclusive Offer', segment_id: segIds[0], channel: 'email', message_template: 'Dear {{name}}, as one of our most valued guests in {{city}}, enjoy 20% off your next order.', status: 'completed', launched_at: daysAgo(8) },
    { name: 'New Member Welcome', segment_id: segIds[2], channel: 'sms', message_template: 'Welcome to BrewCo {{name}}! Use FIRST20 for 20% off your next order.', status: 'completed', launched_at: daysAgo(5) },
    { name: 'Mumbai Weekend Special', segment_id: segIds[3], channel: 'rcs', message_template: 'Hey {{name}}! 🎉 This weekend, enjoy Buy 1 Get 1 at all Mumbai BrewCo outlets!', status: 'running', launched_at: daysAgo(1) },
    { name: 'Loyalty Rewards', segment_id: segIds[6], channel: 'whatsapp', message_template: 'Hi {{name}}, you\'ve spent ₹{{total_spend}} with us! Claim your loyalty reward today.', status: 'draft', launched_at: null },
  ];

  const { data: insertedCamps, error: campErr } = await supabase.from('campaigns').insert(campaigns).select('id,name');
  if (campErr) { console.error('Campaign seed failed:', campErr.message); process.exit(1); }
  console.log(`  ✅ ${insertedCamps?.length} campaigns created`);

  // ─── Campaign Stats ─────────────────────────────────────────────────────────
  console.log('📊 Creating campaign stats...');
  const statsData = (insertedCamps ?? []).slice(0, 4).map((camp, i) => {
    const total = rand(20, 60);
    const sent = i < 3 ? total : rand(10, total);
    const delivered = Math.floor(sent * (rand(75, 95) / 100));
    const opened = Math.floor(delivered * (rand(10, 25) / 100));
    const readCount = Math.floor(opened * (rand(30, 70) / 100));
    const clicked = Math.floor(readCount * (rand(15, 40) / 100));
    const failed = sent - delivered;
    return {
      campaign_id: camp.id,
      total, sent, delivered, failed,
      opened, read_count: readCount, clicked,
      orders_attributed: Math.floor(clicked * 0.12),
      updated_at: new Date().toISOString(),
    };
  });

  const { error: statsErr } = await supabase.from('campaign_stats').insert(statsData);
  if (statsErr) console.warn('Stats seed warning:', statsErr.message);

  // ─── Communications ────────────────────────────────────────────────────────
  console.log('✉️ Creating communication logs...');
  const communications = [];
  const activeCampaigns = insertedCamps?.slice(0, 4) || [];
  
  for (let i = 0; i < activeCampaigns.length; i++) {
    const camp = activeCampaigns[i];
    const campStat = statsData[i];
    const campDaysAgo = [15, 8, 5, 1][i];
    const launchTime = new Date(Date.now() - campDaysAgo * 86400000);

    const selectedCustomers = insertedCustomers
      ?.sort(() => 0.5 - Math.random())
      .slice(0, campStat.total) || [];

    for (let cIdx = 0; cIdx < selectedCustomers.length; cIdx++) {
      const cust = selectedCustomers[cIdx];
      let status: 'failed' | 'delivered' | 'opened' | 'read' | 'clicked' = 'delivered';
      
      if (cIdx < campStat.failed) {
        status = 'failed';
      } else if (cIdx < campStat.failed + campStat.clicked) {
        status = 'clicked';
      } else if (cIdx < campStat.failed + campStat.clicked + campStat.read_count) {
        status = 'read';
      } else if (cIdx < campStat.failed + campStat.clicked + campStat.read_count + campStat.opened) {
        status = 'opened';
      }

      const sentAt = new Date(launchTime.getTime() + cIdx * 60000);
      const deliveredAt = status !== 'failed' ? new Date(sentAt.getTime() + rand(500, 3000)) : null;
      const openedAt = ['opened', 'read', 'clicked'].includes(status) ? new Date(deliveredAt!.getTime() + rand(5000, 60000)) : null;
      const readAt = ['read', 'clicked'].includes(status) ? new Date(openedAt!.getTime() + rand(2000, 10000)) : null;
      const clickedAt = status === 'clicked' ? new Date(readAt!.getTime() + rand(1000, 5000)) : null;

      communications.push({
        campaign_id: camp.id,
        customer_id: cust.id,
        message: campaigns[i].message_template.replace('{{name}}', cust.name),
        status,
        sent_at: sentAt.toISOString(),
        delivered_at: deliveredAt?.toISOString() ?? null,
        opened_at: openedAt?.toISOString() ?? null,
        read_at: readAt?.toISOString() ?? null,
        clicked_at: clickedAt?.toISOString() ?? null,
        updated_at: (clickedAt || readAt || openedAt || deliveredAt || sentAt).toISOString(),
      });
    }
  }

  for (let i = 0; i < communications.length; i += batchSize) {
    const { error } = await supabase.from('communications').insert(communications.slice(i, i + batchSize));
    if (error) console.warn('  ⚠️ Communications batch error:', error.message);
  }
  console.log(`  ✅ ${communications.length} communication logs created`);

  console.log('\n✅ Database seeded successfully!');
  console.log(`   Customers : 100`);
  console.log(`   Orders    : ~${orders.length}`);
  console.log(`   Segments  : 8`);
  console.log(`   Campaigns : 5`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
