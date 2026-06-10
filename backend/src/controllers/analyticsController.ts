import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { asyncHandler } from '../utils/asyncHandler';

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const [
    { count: totalCustomers },
    { count: totalCampaigns },
    { count: activeCampaigns },
    revenueRes,
    statsRes,
    recentCampaignsRes,
    topSegmentsRes,
    growthRes,
    cityRes,
    commsRes,
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'running'),

    supabase.from('orders').select('amount'),

    supabase.from('campaign_stats').select('total,delivered,sent,failed,opened,clicked'),

    supabase
      .from('campaigns')
      .select('id,name,channel,status,launched_at,created_at,segments(name),campaign_stats(*)')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('segments')
      .select('id,name,description,audience_size,ai_generated')
      .order('audience_size', { ascending: false })
      .limit(5),

    supabase
      .from('customers')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()),

    supabase
      .from('customers')
      .select('city')
      .not('city', 'is', null),

    supabase
      .from('communications')
      .select('sent_at,status')
      .not('sent_at', 'is', null)
      .gte('sent_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const totalRevenue = (revenueRes.data ?? []).reduce(
    (sum: number, o: { amount: number }) => sum + Number(o.amount),
    0
  );

  const allStats = statsRes.data ?? [];
  const totalSent = allStats.reduce((s: number, r: Record<string, number>) => s + (r.total || 0), 0);
  const totalDelivered = allStats.reduce((s: number, r: Record<string, number>) => s + (r.delivered || 0), 0);
  const avgDeliveryRate = totalSent > 0 ? totalDelivered / totalSent : 0;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
  const growthData = growthRes.data ?? [];
  const last30 = growthData.filter((r: { created_at: string }) => new Date(r.created_at).getTime() >= thirtyDaysAgo).length;
  const prev30 = growthData.filter((r: { created_at: string }) => {
    const t = new Date(r.created_at).getTime();
    return t >= sixtyDaysAgo && t < thirtyDaysAgo;
  }).length;
  const growthRate = prev30 === 0 ? 100 : Math.round(((last30 - prev30) / prev30) * 100);

  const cityMap: Record<string, number> = {};
  (cityRes.data ?? []).forEach((r: { city: string }) => {
    cityMap[r.city] = (cityMap[r.city] ?? 0) + 1;
  });
  const cityDistribution = Object.entries(cityMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  const recentCampaigns = (recentCampaignsRes.data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    segment_name: (c.segments as { name: string } | null)?.name ?? null,
    stats: c.campaign_stats,
  }));

  const chartDataMap: Record<string, { day: string; sent: number; delivered: number; opened: number; clicked: number }> = {};

  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    chartDataMap[dateStr] = { day: label, sent: 0, delivered: 0, opened: 0, clicked: 0 };
  }

  (commsRes.data ?? []).forEach((c: { sent_at: string; status: string }) => {
    try {
      const dateStr = new Date(c.sent_at).toISOString().split('T')[0];
      if (chartDataMap[dateStr]) {
        chartDataMap[dateStr].sent++;
        if (['delivered', 'opened', 'read', 'clicked'].includes(c.status)) {
          chartDataMap[dateStr].delivered++;
        }
        if (['opened', 'read', 'clicked'].includes(c.status)) {
          chartDataMap[dateStr].opened++;
        }
        if (c.status === 'clicked') {
          chartDataMap[dateStr].clicked++;
        }
      }
    } catch {}
  });

  const performanceChart = Object.values(chartDataMap).map((d) => ({
    day: d.day,
    delivered: d.sent > 0 ? Math.round((d.delivered / d.sent) * 100) : 0,
    opened: d.delivered > 0 ? Math.round((d.opened / d.delivered) * 100) : 0,
    clicked: d.opened > 0 ? Math.round((d.clicked / d.opened) * 100) : 0,
  }));

  res.json({
    success: true,
    data: {
      totalCustomers: totalCustomers ?? 0,
      totalCampaigns: totalCampaigns ?? 0,
      activeCampaigns: activeCampaigns ?? 0,
      totalRevenue,
      totalRevenueAttributed: totalRevenue,
      avgDeliveryRate,
      customerGrowth: { last30Days: last30, previous30Days: prev30, growthRate },
      cityDistribution,
      recentCampaigns,
      topSegments: topSegmentsRes.data ?? [],
      performanceChart,
    },
  });
});
