'use client';


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { segmentsApi } from '@/lib/api-client';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import { ArrowLeft, Users, Target, Sparkles, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import type { Segment, Customer } from '@/types';
import { SegmentAnalytics } from '@/components/segments/SegmentAnalytics';

export default function SegmentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const { data: segment, isLoading, refetch, isRefetching } = useQuery<Segment>({
    queryKey: ['segment', id],
    queryFn: () => segmentsApi.getById(id) as Promise<Segment>,
  });

  const { data: customersData, refetch: refetchCustomers, isRefetching: isRefetchingCustomers } = useQuery<{ data: Customer[]; total: number }>({
    queryKey: ['segment-customers', id, page],
    queryFn: () => segmentsApi.getCustomers(id, { page, limit: PAGE_SIZE }) as Promise<{ data: Customer[]; total: number }>,
    enabled: !!segment,
  });

  const totalCustomers = customersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCustomers / PAGE_SIZE));

  const { data: analyticsCustomersData, isLoading: analyticsLoading, refetch: refetchAnalytics, isRefetching: isRefetchingAnalytics } = useQuery<{ data: Customer[] }>({
    queryKey: ['segment-analytics-customers', id],
    queryFn: () => segmentsApi.getCustomers(id, { limit: 100 }) as Promise<{ data: Customer[] }>,
    enabled: !!segment,
  });

  const FIELD_LABELS: Record<string, string> = {
    total_spend: 'Total Spend',
    order_count: 'Order Count',
    days_since_last_order: 'Days Since Last Order',
    visit_count: 'Visit Count',
    city: 'City',
    gender: 'Gender',
  };

  const OP_LABELS: Record<string, string> = {
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    eq: '=',
    neq: '≠',
    in: 'in',
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-8 w-48 rounded bg-zinc-100" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-zinc-100" />)}
        </div>
      </div>
    );
  }

  if (!segment) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="mt-1 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{segment.name}</h2>
            {segment.ai_generated && (
              <span className="flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-400 border border-transparent dark:border-purple-900/20">
                <Sparkles size={10} /> AI Generated
              </span>
            )}
          </div>
          {segment.description && (
            <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">{segment.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetch();
              refetchCustomers();
              refetchAnalytics();
            }}
            disabled={isRefetching || isRefetchingCustomers || isRefetchingAnalytics}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh segment details"
          >
            <RefreshCw size={14} className={cn((isRefetching || isRefetchingCustomers || isRefetchingAnalytics) && 'animate-spin')} />
            Refresh
          </button>
          <Link
            href={`/campaigns/new?segmentId=${segment.id}`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Audience Size</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{segment.audience_size.toLocaleString()}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">matching customers</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Logic</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{segment.rules.logic}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">between conditions</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Conditions</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{segment.rules.conditions.length}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">filter rules</p>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Visual Insights</p>
        <SegmentAnalytics
          customers={analyticsCustomersData?.data ?? []}
          isLoading={analyticsLoading}
        />
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Rules */}
        <div className="col-span-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Segment Rules</p>
          <div className="space-y-2">
            {segment.rules.conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/30 rounded px-1.5 py-0.5">
                    {segment.rules.logic}
                  </span>
                )}
                <div className="flex items-center gap-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm flex-1">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{FIELD_LABELS[cond.field] ?? cond.field}</span>
                  <span className="font-mono text-zinc-400 dark:text-zinc-500">{OP_LABELS[cond.operator] ?? cond.operator}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{String(cond.value)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-zinc-300 dark:text-zinc-600">
            Created {formatRelativeTime(segment.created_at)}
          </p>
        </div>

        {/* Customers */}
        <div className="col-span-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-zinc-100 dark:border-zinc-800 px-5 py-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Matching Customers</p>
            {customersData && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{totalCustomers.toLocaleString()} total</p>
            )}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th className="dark:text-zinc-400">Name</th>
                <th className="dark:text-zinc-400">City</th>
                <th className="dark:text-zinc-400">Spend</th>
                <th className="dark:text-zinc-400">Orders</th>
              </tr>
            </thead>
            <tbody>
              {!customersData ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td><div className="h-3 w-28 rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td><div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td><div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                    <td><div className="h-3 w-8 rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                  </tr>
                ))
              ) : (customersData.data ?? []).map((c: Customer) => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</td>
                  <td className="text-zinc-500 dark:text-zinc-400">{c.city ?? '—'}</td>
                  <td className="text-zinc-600 dark:text-zinc-400">₹{c.total_spend.toLocaleString()}</td>
                  <td className="text-zinc-500 dark:text-zinc-400">{c.order_count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Page {page} of {totalPages}
              {totalCustomers > 0 && (
                <span className="ml-1">· Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCustomers)} of {totalCustomers.toLocaleString()}</span>
              )}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
