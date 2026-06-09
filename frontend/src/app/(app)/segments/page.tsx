'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { segmentsApi } from '@/lib/api-client';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { Target, Plus, Users, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Segment } from '@/types';

export default function SegmentsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Segment[]>({
    queryKey: ['segments'],
    queryFn: () => segmentsApi.getAll() as Promise<Segment[]>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => segmentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['segments'] });
      toast.success('Segment deleted');
    },
    onError: () => toast.error('Failed to delete segment'),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Segments</h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            {data?.length ?? '—'} segments defined
          </p>
        </div>
        <Link
          href="/segments/new"
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={14} />
          Create Segment
        </Link>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-zinc-200 bg-white p-5">
              <div className="h-3 w-24 rounded bg-zinc-100 mb-2" />
              <div className="h-4 w-32 rounded bg-zinc-100 mb-4" />
              <div className="h-3 w-20 rounded bg-zinc-50" />
            </div>
          ))}
        </div>
      ) : data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white py-20">
          <Target size={32} className="text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No segments yet</p>
          <p className="mt-1 text-xs text-zinc-400">Create your first segment to target specific customers</p>
          <Link href="/segments/new" className="mt-4 flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={14} /> Create Segment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {data?.map((seg) => (
            <Link
              key={seg.id}
              href={`/segments/${seg.id}`}
              className="group relative rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <Target size={14} className="text-blue-600" />
                </div>
                <div className="flex items-center gap-1.5">
                  {seg.ai_generated && (
                    <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-600">
                      <Sparkles size={10} /> AI
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm('Delete this segment?')) deleteMutation.mutate(seg.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <p className="font-semibold text-zinc-900 mb-1">{seg.name}</p>
              {seg.description && (
                <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{seg.description}</p>
              )}

              <div className="flex items-center gap-1.5 text-sm">
                <Users size={13} className="text-zinc-300" />
                <span className="font-medium text-zinc-700">{seg.audience_size.toLocaleString()}</span>
                <span className="text-zinc-400">customers</span>
              </div>

              <p className="mt-2 text-[11px] text-zinc-300">{formatRelativeTime(seg.created_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
