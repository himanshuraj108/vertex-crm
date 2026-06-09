'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, aiApi } from '@/lib/api-client';
import { formatCurrency, formatPercent, CHANNEL_CONFIG, STATUS_CONFIG } from '@/lib/utils';
import { Users, Megaphone, TrendingUp, DollarSign, Sparkles, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DashboardStats, Campaign } from '@/types';

function KPICard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
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
    <div className="rounded-lg border border-zinc-200 bg-white p-5 animate-pulse">
      <div className="h-3 w-20 rounded bg-zinc-100 mb-3" />
      <div className="h-7 w-28 rounded bg-zinc-100 mb-2" />
      <div className="h-3 w-16 rounded bg-zinc-100" />
    </div>
  );
}

const MOCK_CHART_DATA = Array.from({ length: 14 }, (_, i) => ({
  day: `Jun ${i + 1}`,
  delivered: Math.floor(Math.random() * 30 + 60),
  opened: Math.floor(Math.random() * 20 + 40),
  clicked: Math.floor(Math.random() * 15 + 20),
}));

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsApi.getDashboard() as Promise<DashboardStats>,
  });

  const chartData = stats?.performanceChart && stats.performanceChart.length > 0
    ? stats.performanceChart
    : MOCK_CHART_DATA;

  const { data: aiSuggestion, isLoading: aiLoading } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: () => aiApi.suggestSegments() as Promise<{ insight: string }>,
    retry: false,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Good morning</h2>
          <p className="mt-0.5 text-sm text-zinc-400">Here&apos;s what&apos;s happening with your campaigns</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/segments/new"
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Plus size={14} />
            New Segment
          </Link>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Megaphone size={14} />
            New Campaign
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KPICard label="Total Customers" value={stats?.totalCustomers?.toLocaleString() ?? '—'} sub="across all segments" icon={Users} accent="bg-blue-50 text-blue-600" />
            <KPICard label="Active Campaigns" value={String(stats?.activeCampaigns ?? '—')} sub="currently running" icon={Megaphone} accent="bg-amber-50 text-amber-600" />
            <KPICard label="Avg Delivery Rate" value={`${Math.round((stats?.avgDeliveryRate ?? 0) * 100)}%`} sub="across all channels" icon={TrendingUp} accent="bg-green-50 text-green-600" />
            <KPICard label="Revenue Attributed" value={formatCurrency(stats?.totalRevenueAttributed ?? 0)} sub="from campaigns" icon={DollarSign} accent="bg-purple-50 text-purple-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Chart */}
        <div className="col-span-2 rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">Campaign Performance</p>
            <p className="text-xs text-zinc-400">Last 14 days</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                contentStyle={{ border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ fontWeight: 600, color: '#09090B' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="delivered" stroke="#2563EB" strokeWidth={2} dot={false} name="Delivered %" />
              <Line type="monotone" dataKey="opened" stroke="#16A34A" strokeWidth={2} dot={false} name="Opened %" />
              <Line type="monotone" dataKey="clicked" stroke="#D97706" strokeWidth={2} dot={false} name="Clicked %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insight */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">AI Insight</p>
            </div>
            {aiLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 rounded bg-blue-100" />
                <div className="h-3 w-3/4 rounded bg-blue-100" />
                <div className="h-3 w-5/6 rounded bg-blue-100" />
              </div>
            ) : (
              <p className="text-sm text-blue-900 leading-relaxed">
                {(aiSuggestion as { insight?: string })?.insight ??
                  'Re-engage customers who haven\'t ordered in 60+ days — they represent high revenue recovery potential.'}
              </p>
            )}
            <Link href="/ai" className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
              Ask AI Assistant <ArrowRight size={11} />
            </Link>
          </div>

          {/* Quick stats */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="mb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Quick Links</p>
            <div className="space-y-2">
              {[
                { label: 'View all customers', href: '/customers' },
                { label: 'Create segment', href: '/segments/new' },
                { label: 'Launch campaign', href: '/campaigns/new' },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">
                  {l.label}
                  <ArrowRight size={12} className="text-zinc-300" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-900">Recent Campaigns</p>
          <Link href="/campaigns" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
            View all <ArrowRight size={11} />
          </Link>
        </div>
        {isLoading ? (
          <div className="animate-pulse p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded bg-zinc-50" />)}
          </div>
        ) : (stats?.recentCampaigns ?? []).length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-400">No campaigns yet.</p>
            <Link href="/campaigns/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Create your first campaign</Link>
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
                <tr key={c.id} onClick={() => window.location.href = `/campaigns/${c.id}`}>
                  <td className="font-medium text-zinc-900">{c.name}</td>
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
                  <td className="text-zinc-600">{c.stats?.sent ?? '—'}</td>
                  <td className="text-zinc-600">
                    {c.stats ? formatPercent(c.stats.delivered, c.stats.sent) : '—'}
                  </td>
                  <td className="text-zinc-600">
                    {c.stats ? formatPercent(c.stats.opened, c.stats.delivered) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
