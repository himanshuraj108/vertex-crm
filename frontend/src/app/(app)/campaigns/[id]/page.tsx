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
  return (
    <motion.span
      key={display}
      initial={{ scale: 1.2, color: '#2563EB' }}
      animate={{ scale: 1, color: 'currentColor' }}
      transition={{ duration: 0.3 }}
    >
      {display.toLocaleString()}
    </motion.span>
  );
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
          <strong key={partIdx} className="font-semibold text-zinc-900 dark:text-zinc-100">
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
        <div key={pIdx} className="flex gap-2.5 items-start mt-3 first:mt-0 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-950/30 text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-0.5">
            {num}
          </span>
          <p className="flex-1">{content}</p>
        </div>
      );
    }

    return (
      <p key={pIdx} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mt-2.5 first:mt-0">
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
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-report'>('overview');

  const { data: campaign, refetch: refetchCampaign, isRefetching: isRefetchingCampaign } = useQuery<Campaign>({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getById(id) as Promise<Campaign>,
  });

  const { data: commsData, refetch: refetchComms, isRefetching: isRefetchingComms } = useQuery<PaginatedResponse<Communication>>({
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
    { name: 'Sent',      value: displayStats.sent,      fill: 'var(--accent)' },
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
      toast.success('Performance insights generated');
    } catch {
      toast.error('Could not generate analysis');
    } finally {
      setAiLoading(false);
    }
  };

  if (!campaign) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="grid grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button onClick={() => router.back()} className="mt-1 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{campaign.name}</h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[campaign.status]?.className}`}>
                {campaign.status === 'running' && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                {STATUS_CONFIG[campaign.status]?.label}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_CONFIG[campaign.channel]?.className}`}>
                {CHANNEL_CONFIG[campaign.channel]?.label}
              </span>
              {campaign.launched_at && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Launched {formatDate(campaign.launched_at)}</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            refetchCampaign();
            refetchComms();
          }}
          disabled={isRefetchingCampaign || isRefetchingComms}
          className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          title="Refresh campaign stats"
        >
          <RefreshCw size={14} className={cn((isRefetchingCampaign || isRefetchingComms) && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors duration-150',
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('ai-report')}
          className={cn(
            'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors duration-150 flex items-center gap-1.5',
            activeTab === 'ai-report'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
          )}
        >
          <Sparkles size={14} className="text-purple-500" /> AI Performance Report
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {displayStats && (
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Total Audience', value: displayStats.total },
                { label: 'Sent Messages',  value: displayStats.sent },
                { label: 'Delivered',      value: displayStats.delivered },
                { label: 'Opened',         value: displayStats.opened },
                { label: 'Clicked Link',   value: displayStats.clicked },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1 font-medium">{label}</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    <AnimatedNumber value={value} />
                  </p>
                  {label !== 'Total Audience' && label !== 'Sent Messages' && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold">{formatPercent(value, displayStats.sent)}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Funnel Chart */}
            {funnelData.length > 0 && (
              <div className="md:col-span-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Delivery Funnel</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {funnelData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* AI Summary Sidebar */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">AI Executive Summary</p>
                </div>
                {aiAnalysis ? (
                  <div className="space-y-3 line-clamp-6 overflow-hidden">
                    {formatMarkdownText(aiAnalysis)}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">Generate an AI-powered summary and insights about the campaign funnel.</p>
                )}
              </div>
              <button
                onClick={() => {
                  if (!aiAnalysis) generateAnalysis();
                  setActiveTab('ai-report');
                }}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40"
              >
                <Sparkles size={13} />
                {aiAnalysis ? 'View Full AI Report' : 'Generate AI Report'}
              </button>
            </div>
          </div>

          {/* Communications Table */}
          {commsData && (commsData.data?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Communications Log</p>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="dark:text-zinc-400">Customer</th>
                    <th className="dark:text-zinc-400">Message</th>
                    <th className="dark:text-zinc-400">Status</th>
                    <th className="dark:text-zinc-400">Sent</th>
                    <th className="dark:text-zinc-400">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {commsData.data.map((c: Communication) => (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="font-medium text-zinc-900 dark:text-zinc-100">{c.customer_name ?? c.customer_id.slice(0,8)}</td>
                      <td className="max-w-[200px] truncate text-xs text-zinc-500 dark:text-zinc-400">{c.message}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[c.status]?.className}`}>
                          {STATUS_CONFIG[c.status]?.label}
                        </span>
                      </td>
                      <td className="text-xs text-zinc-400 dark:text-zinc-500">{c.sent_at ? formatDate(c.sent_at) : '—'}</td>
                      <td className="text-xs text-zinc-400 dark:text-zinc-500">{c.opened_at ? formatDate(c.opened_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: AI Performance Report */}
      {activeTab === 'ai-report' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">AI-Generated Performance Analysis</h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">BrewCo Campaign Optimization Insights</p>
                </div>
              </div>
              {aiAnalysis && (
                <button
                  onClick={generateAnalysis}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <RefreshCw size={12} className={cn(aiLoading && 'animate-spin')} />
                  Re-evaluate
                </button>
              )}
            </div>

            {aiLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw size={24} className="animate-spin text-purple-600 mx-auto" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">BrewCo marketing agent is processing conversion funnel metrics...</p>
              </div>
            ) : aiAnalysis ? (
              <div className="prose max-w-none dark:prose-invert space-y-4 font-sans bg-purple-50/20 dark:bg-purple-950/5 border border-purple-100/50 dark:border-purple-900/10 p-5 rounded-lg">
                {formatMarkdownText(aiAnalysis)}
              </div>
            ) : (
              <div className="py-16 text-center max-w-md mx-auto space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 mx-auto">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No Insights Report Generated Yet</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    Vertex AI will review the delivery stats, attribution numbers, and segment criteria to generate clear, actionable marketing recommendations.
                  </p>
                </div>
                <button
                  onClick={generateAnalysis}
                  className="rounded-md bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Generate Insights Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
