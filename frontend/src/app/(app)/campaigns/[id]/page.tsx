'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi, aiApi } from '@/lib/api-client';
import { CHANNEL_CONFIG, STATUS_CONFIG, formatDate, formatPercent, formatCurrency, cn } from '@/lib/utils';
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import type { Campaign, CampaignStats, Communication, PaginatedResponse } from '@/types';
import { motion } from 'framer-motion';

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => { setDisplay(value); }, [value]);
  return <motion.span key={display} initial={{ scale: 1.2, color: '#2563EB' }} animate={{ scale: 1, color: '#09090B' }} transition={{ duration: 0.3 }}>{display.toLocaleString()}</motion.span>;
}

function formatMarkdownText(text: string) {
  if (!text) return null;
  return text.split('\n').map((paragraph, pIdx) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return null;

    const isListItem = /^\d+\.\s+/.test(trimmed);
    const cleanParagraph = isListItem ? trimmed.replace(/^\d+\.\s+/, '') : trimmed;

    const parts = cleanParagraph.split(/(\*\*.*?\*\*)/g);
    const content = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={partIdx} className="font-semibold text-zinc-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (isListItem) {
      const match = trimmed.match(/^(\d+)\.\s+/);
      const num = match ? match[1] : '';
      return (
        <div key={pIdx} className="flex gap-2.5 items-start mt-3 first:mt-0 text-sm text-zinc-600 leading-relaxed">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-50 text-[10px] font-bold text-purple-600 mt-0.5">
            {num}
          </span>
          <p className="flex-1">{content}</p>
        </div>
      );
    }

    return (
      <p key={pIdx} className="text-sm text-zinc-600 leading-relaxed mt-2.5 first:mt-0">
        {content}
      </p>
    );
  });
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const { data: campaign } = useQuery<Campaign>({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getById(id) as Promise<Campaign>,
  });

  const { data: commsData } = useQuery<PaginatedResponse<Communication>>({
    queryKey: ['campaign-comms', id],
    queryFn: () => campaignsApi.getCommunications(id, { limit: 20 }) as Promise<PaginatedResponse<Communication>>,
  });

  // SSE for live stats
  useEffect(() => {
    if (!id) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    const es = new EventSource(`${apiUrl}/campaigns/${id}/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.stats) setStats(data.stats);
      } catch {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [id]);

  const displayStats = stats ?? campaign?.stats;

  const funnelData = displayStats ? [
    { name: 'Sent',      value: displayStats.sent,      fill: '#3B82F6' },
    { name: 'Delivered', value: displayStats.delivered,  fill: '#6366F1' },
    { name: 'Opened',    value: displayStats.opened,     fill: '#F59E0B' },
    { name: 'Read',      value: displayStats.read_count, fill: '#10B981' },
    { name: 'Clicked',   value: displayStats.clicked,    fill: '#059669' },
  ] : [];

  const generateAnalysis = async () => {
    setAiLoading(true);
    try {
      const result = await aiApi.analyzeCampaign(id) as { analysis: string };
      setAiAnalysis(result.analysis);
    } catch {
      toast.error('Could not generate analysis');
    } finally {
      setAiLoading(false);
    }
  };

  if (!campaign) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-zinc-100" />
        <div className="grid grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-lg bg-zinc-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button onClick={() => router.back()} className="mt-1 text-zinc-400 hover:text-zinc-700">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">{campaign.name}</h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[campaign.status]?.className}`}>
                {campaign.status === 'running' && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                {STATUS_CONFIG[campaign.status]?.label}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_CONFIG[campaign.channel]?.className}`}>
                {CHANNEL_CONFIG[campaign.channel]?.label}
              </span>
              {campaign.launched_at && (
                <span className="text-xs text-zinc-400">Launched {formatDate(campaign.launched_at)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {displayStats && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Total',     value: displayStats.total },
            { label: 'Sent',      value: displayStats.sent },
            { label: 'Delivered', value: displayStats.delivered },
            { label: 'Opened',    value: displayStats.opened },
            { label: 'Clicked',   value: displayStats.clicked },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="text-xs text-zinc-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-zinc-900">
                <AnimatedNumber value={value} />
              </p>
              {label !== 'Total' && label !== 'Sent' && (
                <p className="text-xs text-zinc-400">{formatPercent(value, displayStats.sent)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Funnel Chart */}
        {funnelData.length > 0 && (
          <div className="col-span-2 rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm font-semibold text-zinc-900 mb-4">Delivery Funnel</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Analysis */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-purple-600" />
            <p className="text-sm font-semibold text-zinc-900">AI Analysis</p>
          </div>
          {aiAnalysis ? (
            <div className="space-y-3">
              {formatMarkdownText(aiAnalysis)}
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-400 mb-4">Get AI-powered insights on this campaign&apos;s performance.</p>
              <button
                onClick={generateAnalysis}
                disabled={aiLoading || campaign.status === 'draft'}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40"
              >
                {aiLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Sparkles size={13} /> Generate Analysis</>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Communications Table */}
      {commsData && (commsData.data?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-zinc-100 px-5 py-4">
            <p className="text-sm font-semibold text-zinc-900">Communications</p>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Message</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {commsData.data.map((c: Communication) => (
                <tr key={c.id}>
                  <td className="font-medium text-zinc-900">{c.customer_name ?? c.customer_id.slice(0,8)}</td>
                  <td className="max-w-[200px] truncate text-xs text-zinc-500">{c.message}</td>
                  <td>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[c.status]?.className}`}>
                      {STATUS_CONFIG[c.status]?.label}
                    </span>
                  </td>
                  <td className="text-xs text-zinc-400">{c.sent_at ? formatDate(c.sent_at) : '—'}</td>
                  <td className="text-xs text-zinc-400">{c.opened_at ? formatDate(c.opened_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
