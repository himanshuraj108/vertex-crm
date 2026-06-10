'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { analyticsApi, aiApi } from '@/lib/api-client';
import { formatCurrency, formatPercent, CHANNEL_CONFIG, STATUS_CONFIG, cn } from '@/lib/utils';
import { Users, Megaphone, TrendingUp, DollarSign, Sparkles, ArrowRight, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DashboardStats, Campaign } from '@/types';

const TIMELINE_OPTIONS = [
  { label: '7d',  days: 7 },
  { label: '14d', days: 14 },
  { label: '1m',  days: 30 },
  { label: '3m',  days: 90 },
  { label: '6m',  days: 180 },
];

const CHANNEL_DIST_DATA = [
  { name: 'WhatsApp', value: 325, color: '#25D366' },
  { name: 'Email',    value: 52,  color: '#2563EB' },
  { name: 'SMS',      value: 25,  color: '#D97706' },
  { name: 'RCS',      value: 22,  color: '#7C3AED' },
];

const FUNNEL_DATA = [
  { name: 'Sent',      value: 424, fill: '#2563EB' },
  { name: 'Delivered', value: 195, fill: '#16A34A' },
  { name: 'Opened',    value: 87,  fill: '#D97706' },
  { name: 'Clicked',   value: 28,  fill: '#DC2626' },
];

const TOOLTIP_STYLE = {
  background: 'var(--surface, #fff)',
  border: '1px solid var(--border, #e4e4e7)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-primary, #18181b)',
};

function generateMockData(days: number) {
  const count = Math.min(days, 30);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (count - 1 - i));
    return {
      day: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      delivered: Math.floor(Math.random() * 25 + 55),
      opened:    Math.floor(Math.random() * 20 + 35),
      clicked:   Math.floor(Math.random() * 15 + 18),
    };
  });
}

function KPICard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon size={16} className="text-current" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-pulse">
      <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800 mb-3" />
      <div className="h-7 w-28 rounded bg-zinc-100 dark:bg-zinc-800 mb-2" />
      <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

export default function DashboardPage() {
  const [timeline, setTimeline]   = useState(14);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie'>('line');

  const { data: stats, isLoading, refetch, isRefetching } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsApi.getDashboard() as Promise<DashboardStats>,
  });

  const chartData = useMemo(() => {
    const base =
      stats?.performanceChart && stats.performanceChart.length > 0
        ? stats.performanceChart
        : generateMockData(timeline);
    return base.slice(-Math.min(timeline, base.length));
  }, [stats, timeline]);

  const pieData = useMemo(() => [
    { name: 'Delivered', value: chartData.reduce((s, d) => s + (d.delivered ?? 0), 0), color: '#2563EB' },
    { name: 'Opened',    value: chartData.reduce((s, d) => s + (d.opened   ?? 0), 0), color: '#16A34A' },
    { name: 'Clicked',   value: chartData.reduce((s, d) => s + (d.clicked  ?? 0), 0), color: '#D97706' },
  ], [chartData]);

  const { data: aiSuggestion, isLoading: aiLoading, refetch: refetchAi, isRefetching: isRefetchingAi } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: () => aiApi.suggestSegments() as Promise<{ insight: string }>,
    retry: false,
  });

  const sharedAxis = {
    tick: { fontSize: 11, fill: '#A1A1AA' },
    tickLine: false as const,
    axisLine: false as const,
  };

  const commonChartProps = {
    data: chartData,
    margin: { top: 4, right: 10, left: -20, bottom: 0 },
  };

  const SharedAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e4e4e7)" />
      <XAxis dataKey="day" {...sharedAxis} />
      <YAxis {...sharedAxis} unit="%" />
      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ fontWeight: 600 }} />
      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
    </>
  );

  function renderChart() {
    if (chartType === 'bar') return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart {...commonChartProps}>
          {SharedAxes}
          <Bar dataKey="delivered" fill="#2563EB" name="Delivered %" radius={[3,3,0,0]} />
          <Bar dataKey="opened"    fill="#16A34A" name="Opened %"    radius={[3,3,0,0]} />
          <Bar dataKey="clicked"   fill="#D97706" name="Clicked %"   radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    );

    if (chartType === 'area') return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart {...commonChartProps}>
          <defs>
            <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D97706" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#D97706" stopOpacity={0}/>
            </linearGradient>
          </defs>
          {SharedAxes}
          <Area type="monotone" dataKey="delivered" stroke="#2563EB" strokeWidth={2} fill="url(#gD)" name="Delivered %" />
          <Area type="monotone" dataKey="opened"    stroke="#16A34A" strokeWidth={2} fill="url(#gO)" name="Opened %"    />
          <Area type="monotone" dataKey="clicked"   stroke="#D97706" strokeWidth={2} fill="url(#gC)" name="Clicked %"   />
        </AreaChart>
      </ResponsiveContainer>
    );

    if (chartType === 'pie') return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={pieData} cx="50%" cy="50%"
            innerRadius={55} outerRadius={90}
            paddingAngle={3} dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );

    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart {...commonChartProps}>
          {SharedAxes}
          <Line type="monotone" dataKey="delivered" stroke="#2563EB" strokeWidth={2} dot={false} name="Delivered %" />
          <Line type="monotone" dataKey="opened"    stroke="#16A34A" strokeWidth={2} dot={false} name="Opened %"    />
          <Line type="monotone" dataKey="clicked"   stroke="#D97706" strokeWidth={2} dot={false} name="Clicked %"   />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Good morning</h2>
          <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">Here&apos;s what&apos;s happening with your campaigns</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { refetch(); refetchAi(); }}
            disabled={isRefetching || isRefetchingAi}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn((isRefetching || isRefetchingAi) && 'animate-spin')} />
            Refresh
          </button>
          <Link href="/segments/new" className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <Plus size={14} /> New Segment
          </Link>
          <Link href="/campaigns/new" className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <Megaphone size={14} /> New Campaign
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KPICard label="Total Customers"    value={stats?.totalCustomers?.toLocaleString() ?? '—'}          sub="across all segments"  icon={Users}      accent="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-900/30" />
            <KPICard label="Active Campaigns"   value={String(stats?.activeCampaigns ?? '—')}                   sub="currently running"    icon={Megaphone}  accent="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-transparent dark:border-amber-900/30" />
            <KPICard label="Avg Delivery Rate"  value={`${Math.round((stats?.avgDeliveryRate ?? 0) * 100)}%`}   sub="across all channels"  icon={TrendingUp}  accent="bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border border-transparent dark:border-green-900/30" />
            <KPICard label="Revenue Attributed" value={formatCurrency(stats?.totalRevenueAttributed ?? 0)}      sub="from campaigns"       icon={DollarSign}  accent="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-transparent dark:border-purple-900/30" />
          </>
        )}
      </div>

      {/* Campaign Performance chart */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Campaign Performance</p>
            <div className="flex items-center gap-2">
              {/* Timeline pill buttons */}
              <div className="flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-0.5 gap-0.5">
                {TIMELINE_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    onClick={() => setTimeline(opt.days)}
                    className={cn(
                      'rounded px-2.5 py-1 text-[11px] font-medium transition-all',
                      timeline === opt.days
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Chart type dropdown */}
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as typeof chartType)}
                className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="area">Area Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>
          </div>
          {renderChart()}
        </div>

        {/* AI Insight + Quick Links */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-blue-100 dark:border-blue-900/30 bg-blue-50/60 dark:bg-blue-950/15 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">AI Insight</p>
            </div>
            {aiLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 rounded bg-blue-100 dark:bg-blue-900" />
                <div className="h-3 w-3/4 rounded bg-blue-100 dark:bg-blue-900" />
                <div className="h-3 w-5/6 rounded bg-blue-100 dark:bg-blue-900" />
              </div>
            ) : (
              <p className="text-sm text-blue-900 dark:text-zinc-300 leading-relaxed">
                {(aiSuggestion as { insight?: string })?.insight ??
                  "Re-engage customers who haven't ordered in 60+ days — they represent high revenue recovery potential."}
              </p>
            )}
            <Link href="/ai" className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-750">
              Ask AI Assistant <ArrowRight size={11} />
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
            <p className="mb-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Quick Links</p>
            <div className="space-y-2">
              {[
                { label: 'View all customers', href: '/customers' },
                { label: 'Create segment',     href: '/segments/new' },
                { label: 'Launch campaign',    href: '/campaigns/new' },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  {l.label}
                  <ArrowRight size={12} className="text-zinc-300 dark:text-zinc-600" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Extra Charts Row */}
      <div className="grid grid-cols-2 gap-4">

        {/* Chart A: Channel Distribution — clean ranked table with inline bar */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Channel Distribution</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Messages sent by channel</p>
            </div>
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded">All time</span>
          </div>
          {/* Stacked total bar */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {CHANNEL_DIST_DATA.map((c) => {
                const total = CHANNEL_DIST_DATA.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={c.name} style={{ width: `${(c.value / total) * 100}%`, background: c.color }} />
                );
              })}
            </div>
          </div>
          {/* Channel rows */}
          <div className="px-5 pb-4 space-y-0 divide-y divide-zinc-50 dark:divide-zinc-800/60">
            {CHANNEL_DIST_DATA.map((c, rank) => {
              const total = CHANNEL_DIST_DATA.reduce((s, x) => s + x.value, 0);
              const pct = Math.round((c.value / total) * 100);
              return (
                <div key={c.name} className="flex items-center gap-4 py-3">
                  <span className="text-[10px] font-semibold text-zinc-300 dark:text-zinc-600 w-4 shrink-0">{rank + 1}</span>
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{c.name}</span>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.color, opacity: 0.75 }} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 w-8 text-right shrink-0">{c.value}</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 w-8 text-right shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart B: Engagement Funnel — clean stepped design */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Engagement Funnel</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Sent → Delivered → Opened → Clicked</p>
            </div>
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded">All campaigns</span>
          </div>
          <div className="px-5 py-4 space-y-0 divide-y divide-zinc-50 dark:divide-zinc-800/60">
            {FUNNEL_DATA.map((step, i) => {
              const pct  = Math.round((step.value / FUNNEL_DATA[0].value) * 100);
              const drop = i > 0
                ? Math.round(((FUNNEL_DATA[i-1].value - step.value) / FUNNEL_DATA[i-1].value) * 100)
                : null;
              return (
                <div key={step.name} className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold text-zinc-300 dark:text-zinc-600 w-4 shrink-0 text-right">{i + 1}</span>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{step.name}</span>
                      {drop !== null && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                          −{drop}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{step.value.toLocaleString()}</span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 w-8 text-right tabular-nums">{pct}%</span>
                    </div>
                  </div>
                  <div className="ml-7 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: step.fill }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-4 pt-1 flex items-center justify-between">
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              {FUNNEL_DATA[3].value} clicks from {FUNNEL_DATA[0].value} sent
            </p>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {Math.round((FUNNEL_DATA[3].value / FUNNEL_DATA[0].value) * 100)}% CTR
            </span>
          </div>
        </div>

      </div>

      {/* Recent Campaigns table */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent Campaigns</p>
          <Link href="/campaigns" className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700">
            View all <ArrowRight size={11} />
          </Link>
        </div>
        {isLoading ? (
          <div className="animate-pulse p-5 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-zinc-50 dark:bg-zinc-800" />)}
          </div>
        ) : (stats?.recentCampaigns ?? []).length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No campaigns yet.</p>
            <Link href="/campaigns/new" className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Create your first campaign
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Delivery</th>
                <th>Open Rate</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentCampaigns ?? []).map((c: Campaign) => (
                <tr
                  key={c.id}
                  onClick={() => (window.location.href = `/campaigns/${c.id}`)}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer"
                >
                  <td className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_CONFIG[c.channel]?.className}`}>
                      {CHANNEL_CONFIG[c.channel]?.label}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[c.status]?.className}`}>
                      {STATUS_CONFIG[c.status]?.label}
                    </span>
                  </td>
                  <td className="text-zinc-500 dark:text-zinc-400">{c.stats?.sent ?? '—'}</td>
                  <td className="text-zinc-500 dark:text-zinc-400">{c.stats ? formatPercent(c.stats.delivered, c.stats.sent) : '—'}</td>
                  <td className="text-zinc-500 dark:text-zinc-400">{c.stats ? formatPercent(c.stats.opened, c.stats.delivered) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
