'use client';


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { segmentsApi } from '@/lib/api-client';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { ArrowLeft, Users, Target, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Segment, Customer } from '@/types';

export default function SegmentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  const { data: segment, isLoading } = useQuery<Segment>({
    queryKey: ['segment', id],
    queryFn: () => segmentsApi.getById(id) as Promise<Segment>,
  });

  const { data: customersData } = useQuery<{ data: Customer[]; total: number }>({
    queryKey: ['segment-customers', id],
    queryFn: () => segmentsApi.getCustomers(id, { limit: 20 }) as Promise<{ data: Customer[]; total: number }>,
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
        <button onClick={() => router.back()} className="mt-1 text-zinc-400 hover:text-zinc-700">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-zinc-900">{segment.name}</h2>
            {segment.ai_generated && (
              <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-600">
                <Sparkles size={10} /> AI Generated
              </span>
            )}
          </div>
          {segment.description && (
            <p className="mt-0.5 text-sm text-zinc-400">{segment.description}</p>
          )}
        </div>
        <Link
          href={`/campaigns/new?segmentId=${segment.id}`}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Audience Size</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">{segment.audience_size.toLocaleString()}</p>
          <p className="mt-1 text-xs text-zinc-400">matching customers</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Logic</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">{segment.rules.logic}</p>
          <p className="mt-1 text-xs text-zinc-400">between conditions</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Conditions</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">{segment.rules.conditions.length}</p>
          <p className="mt-1 text-xs text-zinc-400">filter rules</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Rules */}
        <div className="col-span-2 rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold text-zinc-900 mb-4">Segment Rules</p>
          <div className="space-y-2">
            {segment.rules.conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
                    {segment.rules.logic}
                  </span>
                )}
                <div className="flex items-center gap-1.5 rounded-md bg-zinc-50 px-3 py-2 text-sm flex-1">
                  <span className="font-medium text-zinc-700">{FIELD_LABELS[cond.field] ?? cond.field}</span>
                  <span className="font-mono text-zinc-400">{OP_LABELS[cond.operator] ?? cond.operator}</span>
                  <span className="font-semibold text-zinc-900">{String(cond.value)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-zinc-300">
            Created {formatRelativeTime(segment.created_at)}
          </p>
        </div>

        {/* Customers */}
        <div className="col-span-3 rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-zinc-100 px-5 py-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">Matching Customers</p>
            {customersData && (
              <p className="text-xs text-zinc-400">{customersData.total?.toLocaleString() ?? customersData.data?.length} total</p>
            )}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>City</th>
                <th>Spend</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {!customersData ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td><div className="h-3 w-28 rounded bg-zinc-100" /></td>
                    <td><div className="h-3 w-16 rounded bg-zinc-100" /></td>
                    <td><div className="h-3 w-20 rounded bg-zinc-100" /></td>
                    <td><div className="h-3 w-8 rounded bg-zinc-100" /></td>
                  </tr>
                ))
              ) : (customersData.data ?? []).map((c: Customer) => (
                <tr key={c.id}>
                  <td className="font-medium text-zinc-900">{c.name}</td>
                  <td className="text-zinc-500">{c.city ?? '—'}</td>
                  <td className="text-zinc-600">₹{c.total_spend.toLocaleString()}</td>
                  <td className="text-zinc-500">{c.order_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
