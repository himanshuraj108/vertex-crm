'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { segmentsApi, aiApi } from '@/lib/api-client';
import { Plus, X, RefreshCw, Sparkles, ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import type { SegmentRules, SegmentCondition, SegmentPreview } from '@/types';
import { cn } from '@/lib/utils';

const FIELDS = [
  { value: 'total_spend',          label: 'Total Spend',           type: 'number' },
  { value: 'order_count',          label: 'Order Count',           type: 'number' },
  { value: 'days_since_last_order',label: 'Days Since Last Order', type: 'number' },
  { value: 'visit_count',          label: 'Visit Count',           type: 'number' },
  { value: 'city',                 label: 'City',                  type: 'string' },
  { value: 'gender',               label: 'Gender',                type: 'enum', options: ['male','female','other'] },
];

const NUMBER_OPS = [
  { value: 'gt',  label: 'greater than' },
  { value: 'gte', label: 'greater than or equal' },
  { value: 'lt',  label: 'less than' },
  { value: 'lte', label: 'less than or equal' },
  { value: 'eq',  label: 'equals' },
];
const STRING_OPS = [
  { value: 'eq',  label: 'equals' },
  { value: 'neq', label: 'not equals' },
];

function defaultCondition(): SegmentCondition {
  return { field: 'total_spend', operator: 'gt', value: 0 };
}

export default function NewSegmentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<SegmentCondition[]>([defaultCondition()]);
  const [aiInput, setAiInput] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const rules: SegmentRules = { logic, conditions };
  const debouncedRules = useDebounce(rules, 500);

  const { data: preview, isFetching: previewLoading, refetch: refetchPreview, isRefetching: isRefetchingPreview } = useQuery<SegmentPreview>({
    queryKey: ['segment-preview', debouncedRules],
    queryFn: () => segmentsApi.preview(debouncedRules) as Promise<SegmentPreview>,
    enabled: conditions.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () => segmentsApi.create({ name, description, rules }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['segments'] });
      toast.success('Segment created');
      router.push('/segments');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCondition = (i: number, partial: Partial<SegmentCondition>) => {
    setConditions((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...partial } : c)));
  };

  const removeCondition = (i: number) => {
    setConditions((cs) => cs.filter((_, idx) => idx !== i));
  };

  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const result = await aiApi.parseSegment(aiInput) as { rules: SegmentRules; name: string };
      if (result.rules) {
        setConditions(result.rules.conditions);
        setLogic(result.rules.logic);
        if (result.name && !name) setName(result.name);
        setAiModalOpen(false);
        toast.success('AI generated segment rules');
      }
    } catch {
      toast.error('AI could not parse that. Try being more specific.');
    } finally {
      setAiLoading(false);
    }
  };

  const getFieldConfig = (fieldValue: string) =>
    FIELDS.find((f) => f.value === fieldValue) ?? FIELDS[0];

  const getOperators = (fieldValue: string) => {
    const f = getFieldConfig(fieldValue);
    return f.type === 'number' ? NUMBER_OPS : STRING_OPS;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-755 dark:text-zinc-500 dark:hover:text-zinc-300">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">New Segment</h2>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Define rules to target the right customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetchPreview()}
            disabled={previewLoading || isRefetchingPreview || conditions.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh preview"
          >
            <RefreshCw size={14} className={cn((previewLoading || isRefetchingPreview) && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={() => router.back()} className="rounded-md border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!name || conditions.length === 0 || createMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Saving…' : 'Save Segment'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Builder — left 3 cols */}
        <div className="col-span-3 space-y-4">
          {/* Name & description */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Segment Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. High-Value Mumbai Customers"
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What is this segment for?"
                className="w-full resize-none rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Rules */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Conditions</p>
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5">
                {(['AND', 'OR'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLogic(l)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                      logic === l ? 'bg-blue-600 text-white' : 'text-zinc-550 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {conditions.map((cond, i) => {
                const fieldConfig = getFieldConfig(cond.field);
                const ops = getOperators(cond.field);
                return (
                  <div key={i} className="flex items-center gap-2 rounded-md bg-zinc-50 dark:bg-zinc-950 p-3 border border-transparent dark:border-zinc-850">
                    {i > 0 && (
                      <span className="shrink-0 rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-450 border border-transparent dark:border-blue-900/20">
                        {logic}
                      </span>
                    )}

                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(i, { field: e.target.value as SegmentCondition['field'], value: fieldConfig.type === 'number' ? 0 : '' })}
                      className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 outline-none"
                    >
                      {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>

                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(i, { operator: e.target.value as SegmentCondition['operator'] })}
                      className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 outline-none"
                    >
                      {ops.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>

                    {fieldConfig.type === 'enum' ? (
                      <select
                        value={String(cond.value)}
                        onChange={(e) => updateCondition(i, { value: e.target.value })}
                        className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 outline-none"
                      >
                        {fieldConfig.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={fieldConfig.type === 'number' ? 'number' : 'text'}
                        value={String(cond.value)}
                        onChange={(e) => updateCondition(i, { value: fieldConfig.type === 'number' ? Number(e.target.value) : e.target.value })}
                        className="w-28 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 outline-none"
                      />
                    )}

                    <button onClick={() => removeCondition(i)} className="ml-auto shrink-0 rounded p-1 text-zinc-300 dark:text-zinc-600 hover:bg-white dark:hover:bg-zinc-900 hover:text-red-400 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setConditions((cs) => [...cs, defaultCondition()])}
                className="flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Plus size={13} /> Add Condition
              </button>
              <button
                onClick={() => setAiModalOpen(true)}
                className="flex items-center gap-1.5 rounded-md border border-purple-200 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-950/20 px-3 py-2 text-sm font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors"
              >
                <Sparkles size={13} /> Generate with AI
              </button>
            </div>
          </div>
        </div>

        {/* Preview — right 2 cols */}
        <div className="col-span-2">
          <div className="sticky top-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Audience Preview</p>
              {previewLoading && <RefreshCw size={13} className="animate-spin text-zinc-400 dark:text-zinc-500" />}
            </div>

            {previewLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 rounded bg-zinc-50 dark:bg-zinc-800/40" />
                <div className="h-3 w-3/4 rounded bg-zinc-50 dark:bg-zinc-800/40" />
                <div className="h-3 w-1/2 rounded bg-zinc-50 dark:bg-zinc-800/40" />
              </div>
            ) : preview ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 text-center border border-transparent dark:border-blue-900/20">
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{preview.count.toLocaleString()}</p>
                  <p className="text-sm text-blue-500 dark:text-blue-500">{preview.percentage}% of all customers</p>
                </div>
                {preview.sample.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Sample</p>
                    <div className="space-y-1.5">
                      {preview.sample.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-md bg-zinc-50 dark:bg-zinc-950 px-3 py-2 border border-transparent dark:border-zinc-850">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                              {c.name[0]}
                            </div>
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">{c.name}</span>
                          </div>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">{c.city}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <Users size={24} className="text-zinc-200 dark:text-zinc-800 mb-2" />
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Add conditions to see your audience</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-purple-600 dark:text-purple-400" />
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">Generate Segment with AI</p>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"><X size={15} /></button>
            </div>
            <p className="mb-3 text-sm text-zinc-550 dark:text-zinc-400">Describe the audience you want to target in plain English.</p>
            <textarea
              autoFocus
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              rows={3}
              placeholder="e.g. High-value customers from Mumbai who haven't ordered in the last 30 days"
              className="w-full resize-none rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-400 dark:focus:border-purple-500 focus:ring-1 focus:ring-purple-100 dark:focus:ring-purple-900"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAiModalOpen(false)} className="rounded-md border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                Cancel
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiInput.trim()}
                className="flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {aiLoading ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> Generate</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
