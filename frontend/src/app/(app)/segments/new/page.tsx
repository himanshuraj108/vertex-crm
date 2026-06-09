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

  const { data: preview, isFetching: previewLoading } = useQuery<SegmentPreview>({
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
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-zinc-900">New Segment</h2>
          <p className="text-sm text-zinc-400">Define rules to target the right customers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!name || conditions.length === 0 || createMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving…' : 'Save Segment'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Builder — left 3 cols */}
        <div className="col-span-3 space-y-4">
          {/* Name & description */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Segment Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. High-Value Mumbai Customers"
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Description <span className="text-zinc-400 font-normal">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What is this segment for?"
                className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Rules */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">Conditions</p>
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5">
                {(['AND', 'OR'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLogic(l)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                      logic === l ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-700'
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
                  <div key={i} className="flex items-center gap-2 rounded-md bg-zinc-50 p-3">
                    {i > 0 && (
                      <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600">
                        {logic}
                      </span>
                    )}

                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(i, { field: e.target.value as SegmentCondition['field'], value: fieldConfig.type === 'number' ? 0 : '' })}
                      className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 outline-none"
                    >
                      {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>

                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(i, { operator: e.target.value as SegmentCondition['operator'] })}
                      className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 outline-none"
                    >
                      {ops.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>

                    {fieldConfig.type === 'enum' ? (
                      <select
                        value={String(cond.value)}
                        onChange={(e) => updateCondition(i, { value: e.target.value })}
                        className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 outline-none"
                      >
                        {fieldConfig.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={fieldConfig.type === 'number' ? 'number' : 'text'}
                        value={String(cond.value)}
                        onChange={(e) => updateCondition(i, { value: fieldConfig.type === 'number' ? Number(e.target.value) : e.target.value })}
                        className="w-28 rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 outline-none"
                      />
                    )}

                    <button onClick={() => removeCondition(i)} className="ml-auto shrink-0 rounded p-1 text-zinc-300 hover:bg-white hover:text-red-400">
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setConditions((cs) => [...cs, defaultCondition()])}
                className="flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 hover:border-blue-300 hover:text-blue-600"
              >
                <Plus size={13} /> Add Condition
              </button>
              <button
                onClick={() => setAiModalOpen(true)}
                className="flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
              >
                <Sparkles size={13} /> Generate with AI
              </button>
            </div>
          </div>
        </div>

        {/* Preview — right 2 cols */}
        <div className="col-span-2">
          <div className="sticky top-6 rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-zinc-900">Audience Preview</p>
              {previewLoading && <RefreshCw size={13} className="animate-spin text-zinc-400" />}
            </div>

            {previewLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 rounded bg-zinc-50" />
                <div className="h-3 w-3/4 rounded bg-zinc-50" />
                <div className="h-3 w-1/2 rounded bg-zinc-50" />
              </div>
            ) : preview ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <p className="text-3xl font-bold text-blue-700">{preview.count.toLocaleString()}</p>
                  <p className="text-sm text-blue-500">{preview.percentage}% of all customers</p>
                </div>
                {preview.sample.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">Sample</p>
                    <div className="space-y-1.5">
                      {preview.sample.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                              {c.name[0]}
                            </div>
                            <span className="text-sm text-zinc-700">{c.name}</span>
                          </div>
                          <span className="text-xs text-zinc-400">{c.city}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <Users size={24} className="text-zinc-200 mb-2" />
                <p className="text-sm text-zinc-400">Add conditions to see your audience</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-purple-600" />
                <p className="font-semibold text-zinc-900">Generate Segment with AI</p>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-zinc-400 hover:text-zinc-700"><X size={15} /></button>
            </div>
            <p className="mb-3 text-sm text-zinc-500">Describe the audience you want to target in plain English.</p>
            <textarea
              autoFocus
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              rows={3}
              placeholder="e.g. High-value customers from Mumbai who haven't ordered in the last 30 days"
              className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAiModalOpen(false)} className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                Cancel
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiInput.trim()}
                className="flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
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
