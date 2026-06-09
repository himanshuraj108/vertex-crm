'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { segmentsApi, campaignsApi, aiApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CHANNEL_CONFIG, formatCurrency, cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Check, Users, Sparkles, RefreshCw, Megaphone } from 'lucide-react';
import type { Segment } from '@/types';
import { PhonePreview } from '@/components/campaigns/PhonePreview';

type Step = 1 | 2 | 3 | 4;

const CHANNELS = ['whatsapp', 'sms', 'email', 'rcs'] as const;

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Segment' },
    { n: 2, label: 'Channel' },
    { n: 3, label: 'Message' },
    { n: 4, label: 'Review' },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              current === s.n ? 'bg-blue-600 text-white' :
              current > s.n ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' :
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
            )}>
              {current > s.n ? <Check size={12} /> : s.n}
            </div>
            <span className={cn('text-sm font-medium transition-colors', current === s.n ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500')}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('mx-4 h-px w-12 transition-colors', current > s.n ? 'bg-green-200 dark:bg-green-900/50' : 'bg-zinc-200 dark:bg-zinc-800')} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewCampaignPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [launching, setLaunching] = useState(false);

  const { data: segments, isLoading: segmentsLoading, refetch: refetchSegments, isRefetching: isRefetchingSegments } = useQuery<Segment[]>({
    queryKey: ['segments'],
    queryFn: () => segmentsApi.getAll() as Promise<Segment[]>,
    enabled: step === 1,
  });

  const selectedSegment = segments?.find((s) => s.id === selectedSegmentId);

  const createAndLaunch = async () => {
    if (!campaignName || !selectedSegmentId || !selectedChannel || !message) return;
    setLaunching(true);
    try {
      const campaign = await campaignsApi.create({
        name: campaignName,
        segmentId: selectedSegmentId,
        channel: selectedChannel,
        messageTemplate: message,
      }) as { id: string };
      await campaignsApi.launch(campaign.id);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign launched successfully');
      router.push(`/campaigns/${campaign.id}`);
    } catch (e) {
      toast.error('Failed to launch campaign');
      setLaunching(false);
    }
  };

  const saveDraft = async () => {
    if (!campaignName || !selectedSegmentId || !selectedChannel || !message) return;
    try {
      await campaignsApi.create({
        name: campaignName,
        segmentId: selectedSegmentId,
        channel: selectedChannel,
        messageTemplate: message,
      });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Saved as draft');
      router.push('/campaigns');
    } catch {
      toast.error('Failed to save draft');
    }
  };

  const generateMessage = async () => {
    if (!aiPrompt.trim() || !selectedSegment) return;
    setAiLoading(true);
    try {
      const result = await aiApi.draftMessage(
        aiPrompt || (selectedSegment.description ?? selectedSegment.name),
        selectedChannel
      ) as { messageTemplate: string };
      setMessage(result.messageTemplate || '');
      toast.success('AI drafted your message');
    } catch {
      toast.error('AI could not generate. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const insertVariable = (v: string) => setMessage((m) => m + v);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <ArrowLeft size={14} />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">New Campaign</h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Create and launch a personalized campaign</p>
          </div>
        </div>
        
        {step === 1 && (
          <button
            onClick={() => refetchSegments()}
            disabled={isRefetchingSegments}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh segments list"
          >
            <RefreshCw size={14} className={cn(isRefetchingSegments && 'animate-spin')} />
            Refresh
          </button>
        )}
      </div>

      <StepIndicator current={step} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form: takes 2 columns in lg */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Segment */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Select a Segment</p>
              {segmentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-16 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50" />
                ))
              ) : (
                <div className="space-y-2">
                  {segments?.map((seg) => (
                    <button
                      key={seg.id}
                      onClick={() => setSelectedSegmentId(seg.id)}
                      className={cn(
                        'w-full rounded-lg border px-4 py-3 text-left transition-all',
                        selectedSegmentId === seg.id
                          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{seg.name}</p>
                        <div className="flex items-center gap-1 text-sm text-zinc-400 dark:text-zinc-500">
                          <Users size={13} />
                          {seg.audience_size.toLocaleString()}
                        </div>
                      </div>
                      {seg.description && <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1">{seg.description}</p>}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  disabled={!selectedSegmentId}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Channel */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Choose Channel</p>
              <div className="grid grid-cols-2 gap-3">
                {CHANNELS.map((ch) => {
                  const cfg = CHANNEL_CONFIG[ch];
                  return (
                    <button
                      key={ch}
                      onClick={() => setSelectedChannel(ch)}
                      className={cn(
                        'rounded-lg border p-4 text-left transition-all',
                        selectedChannel === ch
                          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      )}
                    >
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{cfg.label}</p>
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 font-medium">Expected open rate: <span className="font-medium text-zinc-600 dark:text-zinc-400">{cfg.openRate}</span></p>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">Back</button>
                <button
                  disabled={!selectedChannel}
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Message */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Campaign Name</label>
                <input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Monsoon Re-engagement"
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-400 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Message Template</label>
                  <div className="flex gap-1">
                    {['{{name}}', '{{city}}', '{{total_spend}}', '{{last_order}}'].map((v) => (
                      <button key={v} onClick={() => insertVariable(v)} className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Hi {{name}}, we miss you at BrewCo..."
                  className="w-full resize-none rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-400 dark:focus:border-blue-500"
                />
                <p className="mt-1 text-right text-xs text-zinc-400 dark:text-zinc-500">{(message || '').length} characters</p>
              </div>

              <div className="rounded-lg border border-purple-100 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-purple-600 dark:text-purple-400" />
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Message Assistant</p>
                </div>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  placeholder="Describe what message you want to send..."
                  className="w-full resize-none rounded-md border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm outline-none focus:border-purple-400 dark:focus:border-purple-500"
                />
                <button
                  onClick={generateMessage}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {aiLoading ? <><RefreshCw size={12} className="animate-spin" /> Generating…</> : <><Sparkles size={12} /> Generate</>}
                </button>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">Back</button>
                <button
                  disabled={!campaignName || !message}
                  onClick={() => setStep(4)}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-sm">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Review & Launch</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-zinc-50 dark:border-zinc-800">
                    <span className="text-zinc-400 dark:text-zinc-500">Campaign Name</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{campaignName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-50 dark:border-zinc-800">
                    <span className="text-zinc-400 dark:text-zinc-500">Segment</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedSegment?.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-50 dark:border-zinc-800">
                    <span className="text-zinc-400 dark:text-zinc-500">Audience</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedSegment?.audience_size.toLocaleString()} customers</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-50 dark:border-zinc-800">
                    <span className="text-zinc-400 dark:text-zinc-500">Channel</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_CONFIG[selectedChannel]?.className}`}>
                      {CHANNEL_CONFIG[selectedChannel]?.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={() => setStep(3)} className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">Back</button>
                <div className="flex gap-2">
                  <button onClick={saveDraft} className="rounded-md border border-zinc-200 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                    Save as Draft
                  </button>
                  <button
                    onClick={createAndLaunch}
                    disabled={launching}
                    className="flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {launching ? <><RefreshCw size={13} className="animate-spin" /> Launching…</> : <><Megaphone size={13} /> Launch Campaign</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Preview Panel: takes 1 column in lg */}
        <div className="lg:col-span-1 lg:sticky lg:top-20">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm">
            <PhonePreview message={message} channel={selectedChannel} />
          </div>
        </div>
      </div>
    </div>
  );
}
