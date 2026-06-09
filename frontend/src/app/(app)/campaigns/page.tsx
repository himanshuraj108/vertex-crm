'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '@/lib/api-client';
import { CHANNEL_CONFIG, STATUS_CONFIG, formatDate, formatPercent } from '@/lib/utils';
import { Plus, Megaphone, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Campaign, PaginatedResponse } from '@/types';

type StatusFilter = 'all' | 'draft' | 'running' | 'completed';
const STATUS_TABS: StatusFilter[] = ['all', 'draft', 'running', 'completed'];

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<StatusFilter>('all');
  const router = useRouter();

  const { data, isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns', activeTab],
    queryFn: () => campaignsApi.getAll(activeTab === 'all' ? undefined : activeTab) as Promise<Campaign[]>,
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Campaigns</h2>
          <p className="mt-0.5 text-sm text-zinc-400">{data?.length ?? '—'} campaigns</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={14} />
          New Campaign
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Delivery</th>
              <th>Open Rate</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j}><div className="h-3 w-20 rounded bg-zinc-100" /></td>
                  ))}
                </tr>
              ))
            ) : data?.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Megaphone size={28} className="mx-auto text-zinc-200 mb-2" />
                  <p className="text-sm text-zinc-400">No {activeTab !== 'all' ? activeTab : ''} campaigns yet</p>
                  <Link href="/campaigns/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                    Create your first campaign
                  </Link>
                </td>
              </tr>
            ) : (
              data?.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/campaigns/${c.id}`)}
                  className="cursor-pointer"
                >
                  <td className="font-medium text-zinc-900 max-w-[180px] truncate">{c.name}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_CONFIG[c.channel]?.className}`}>
                      {CHANNEL_CONFIG[c.channel]?.label}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[c.status]?.className}`}>
                      {c.status === 'running' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
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
                  <td className="text-xs text-zinc-400">{formatDate(c.created_at)}</td>
                  <td>
                    <ChevronRight size={14} className="text-zinc-300" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
