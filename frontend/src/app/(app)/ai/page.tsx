'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '@/lib/api-client';
import { Bot, Send, User, ChevronDown, ChevronUp, Sparkles, X, Edit2, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AIMessage, AIToolCall, ChatSession } from '@/types';
import Link from 'next/link';
import { toast } from 'sonner';

const SUGGESTIONS = [
  "Show me customers who haven't ordered in 60 days",
  "Create a re-engagement segment for churning customers",
  "Draft a Diwali campaign message for high-value customers",
  "Which channel has the best open rate this month?",
];

function ToolCallCard({ toolCall }: { toolCall: AIToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const label = ((toolCall as unknown) as Record<string, unknown>).tool as string ?? toolCall.name ?? 'tool call';
  const displayName = label.replace(/_/g, ' ');

  const renderResult = () => {
    const res = toolCall.result as any;
    if (!res || typeof res !== 'object') {
      return <pre className="text-[10px]">{JSON.stringify(res)}</pre>;
    }

    if (res.error) {
      return <p className="text-red-500 text-xs font-semibold">{res.error}</p>;
    }

    switch (label) {
      case 'query_customers':
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-350">Found {res.count} customers</p>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-zinc-50 dark:bg-zinc-950 shadow-sm">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-655 dark:text-zinc-400 font-medium">
                    <th className="p-1.5 px-3">Name</th>
                    <th className="p-1.5 px-3">City</th>
                    <th className="p-1.5 px-3 text-right">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {(res.customers || []).map((c: any) => (
                    <tr key={c.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                      <td className="p-1.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">{c.name}</td>
                      <td className="p-1.5 px-3">{c.city || '—'}</td>
                      <td className="p-1.5 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">₹{c.total_spend?.toLocaleString() || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {res.note && <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">{res.note}</p>}
          </div>
        );

      case 'create_segment':
        return (
          <div className="space-y-1">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Segment created: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.name}</span>
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Audience size: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.audience_size} customers</span>
            </p>
            {res.segment_id && (
              <Link
                href={`/segments/${res.segment_id}`}
                className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline mt-1"
              >
                View Segment details →
              </Link>
            )}
          </div>
        );

      case 'preview_segment':
        return (
          <div className="space-y-2">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Audience match size: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.count} customers</span>
            </p>
            {res.sample && res.sample.length > 0 && (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-950 p-2 space-y-1.5 text-[10px] shadow-inner">
                <p className="font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-1">Sample Customers:</p>
                {res.sample.map((s: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{s.name}</span>
                    <span>{s.city} (₹{s.total_spend?.toLocaleString()})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'create_campaign':
        return (
          <div className="space-y-1">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Campaign created: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.name}</span>
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Status: <span className="capitalize font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-transparent dark:border-blue-900/20 px-1.5 py-0.5 rounded text-[10px]">{res.status}</span>
            </p>
            {res.campaign_id && (
              <Link
                href={`/campaigns/${res.campaign_id}`}
                className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline mt-1"
              >
                View Campaign tracker →
              </Link>
            )}
          </div>
        );

      case 'launch_campaign':
        return (
          <div className="space-y-1">
            <p className="text-xs text-green-700 dark:text-green-400 font-semibold">{res.message || 'Campaign launched!'}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Status: <span className="capitalize font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-transparent dark:border-green-900/20 px-1.5 py-0.5 rounded text-[10px]">{res.status}</span></p>
          </div>
        );

      case 'get_campaign_stats':
        return (
          <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-md text-zinc-700 dark:text-zinc-300 text-[10px] shadow-sm">
            <div>Total audience: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.total || 0}</span></div>
            <div>Sent count: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.sent || 0}</span></div>
            <div>Delivered: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.delivered || 0}</span></div>
            <div>Opened: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.opened || 0}</span></div>
            <div>Read count: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.read_count || 0}</span></div>
            <div>Clicked: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.clicked || 0}</span></div>
          </div>
        );

      case 'get_analytics_summary':
        return (
          <div className="grid grid-cols-2 gap-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-md text-zinc-700 dark:text-zinc-300 text-[10px] shadow-sm">
            <div>Total Customers: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.total_customers?.toLocaleString()}</span></div>
            <div>Total Campaigns: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.total_campaigns}</span></div>
            <div>Total Revenue: <span className="font-semibold text-zinc-900 dark:text-zinc-100">₹{res.total_revenue_inr?.toLocaleString()}</span></div>
            <div>Avg Delivery Rate: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{res.avg_delivery_rate_pct}%</span></div>
          </div>
        );

      case 'get_channel_stats': {
        const best = res.best_channel_by_open_rate as string;
        const channels = (res.channels ?? []) as Array<{
          channel: string; campaigns: number; total_messages: number;
          delivered: number; opened: number; clicked: number;
          delivery_rate_pct: number; open_rate_pct: number; click_rate_pct: number;
        }>;
        return (
          <div className="space-y-2">
            {best && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Best channel by open rate:{' '}
                <span className="font-semibold capitalize text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/30 px-1.5 py-0.5 rounded text-[10px]">
                  {best}
                </span>
              </p>
            )}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-zinc-50 dark:bg-zinc-950 shadow-sm">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                    <th className="p-1.5 px-3">Channel</th>
                    <th className="p-1.5 px-3 text-right">Messages</th>
                    <th className="p-1.5 px-3 text-right">Delivery%</th>
                    <th className="p-1.5 px-3 text-right">Open%</th>
                    <th className="p-1.5 px-3 text-right">Click%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {channels.map((ch) => (
                    <tr key={ch.channel} className={`bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 ${ch.channel === best ? 'bg-green-50/60 dark:bg-green-950/20' : ''}`}>
                      <td className="p-1.5 px-3 font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                        {ch.channel}
                        {ch.channel === best && <span className="ml-1 text-green-600 dark:text-green-400">★</span>}
                      </td>
                      <td className="p-1.5 px-3 text-right">{ch.total_messages}</td>
                      <td className="p-1.5 px-3 text-right">{ch.delivery_rate_pct}%</td>
                      <td className="p-1.5 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">{ch.open_rate_pct}%</td>
                      <td className="p-1.5 px-3 text-right">{ch.click_rate_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'list_segments': {
        const segs = (res.segments ?? []) as Array<{ id: string; name: string; description?: string; audience_size: number; ai_generated: boolean }>;
        return (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">{res.count} segments found</p>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-zinc-50 dark:bg-zinc-950 shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
              {segs.map((s) => (
                <Link key={s.id} href={`/segments/${s.id}`} className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors group">
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">{s.name}</p>
                    {s.description && <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[200px]">{s.description}</p>}
                  </div>
                  <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{s.audience_size.toLocaleString()} customers</span>
                </Link>
              ))}
            </div>
          </div>
        );
      }

      case 'list_campaigns': {
        const camps = (res.campaigns ?? []) as Array<{ id: string; name: string; status: string; channel: string; segment_name?: string }>;
        const statusColors: Record<string, string> = {
          draft: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800',
          running: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
          completed: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40',
          failed: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40',
        };
        return (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">{res.count} campaigns</p>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {camps.map((c) => (
                <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors group">
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">{c.name}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 capitalize">{c.channel}{c.segment_name ? ` · ${c.segment_name}` : ''}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[c.status] ?? statusColors.draft}`}>{c.status}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      }

      default:
        return (
          <pre className="overflow-x-auto text-[10px] text-zinc-600 dark:text-zinc-400">
            {JSON.stringify(res, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className="mt-2 rounded-md border border-zinc-200 dark:border-zinc-800 border-l-2 border-l-green-500 dark:border-l-green-500 bg-green-50/30 dark:bg-green-950/10 px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-green-600 dark:text-green-400 animate-pulse" />
          <p className="text-[11px] font-semibold text-green-700 dark:text-green-400 capitalize">{displayName}</p>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
      {expanded && (
        <div className="mt-2 rounded-md bg-white dark:bg-zinc-900 p-2.5 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-200">
          {renderResult()}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: AIMessage }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-blue-600' : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      )}>
        {isUser ? <User size={13} className="text-white" /> : <Bot size={13} className="text-zinc-550 dark:text-zinc-400" />}
      </div>
      <div className={cn('max-w-[80%] space-y-1', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'rounded-tr-sm bg-blue-600 text-white'
            : 'rounded-tl-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
        )}>
          {msg.content}
        </div>
        {msg.toolCalls?.map((tc, i) => <ToolCallCard key={i} toolCall={tc} />)}
      </div>
    </motion.div>
  );
}

export default function AIPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionCreations, setSessionCreations] = useState<Array<{ type: string; name: string; id: string }>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadSessions = async (selectLatest = false) => {
    try {
      const res = await aiApi.getSessions() as ChatSession[];
      setSessions(res);
      if (selectLatest && res.length > 0 && !activeSessionId) {
        selectSession(res[0].id, res);
      }
    } catch {}
  };

  useEffect(() => {
    loadSessions(true);
  }, []);

  const handleNewChat = async () => {
    try {
      const newSession = await aiApi.createSession() as ChatSession;
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setSessionCreations([]);
    } catch (err) {
      toast.error('Failed to create new chat session');
    }
  };

  const selectSession = (sessionId: string, currentSessions = sessions) => {
    setActiveSessionId(sessionId);
    const session = currentSessions.find((s) => s.id === sessionId);
    if (session) {
      setMessages(session.messages || []);
      const creations: Array<{ type: string; name: string; id: string }> = [];
      session.messages?.forEach((msg) => {
        msg.toolCalls?.forEach((tc) => {
          const toolName = ((tc as unknown) as Record<string, unknown>).tool as string ?? tc.name;
          const result = tc.result as Record<string, unknown>;
          if (toolName === 'create_segment' && result?.segment_id) {
            creations.push({ type: 'segment', name: String(result?.name ?? 'Segment'), id: String(result.segment_id) });
          }
          if (toolName === 'create_campaign' && result?.campaign_id) {
            creations.push({ type: 'campaign', name: String(result?.name ?? 'Campaign'), id: String(result.campaign_id) });
          }
        });
      });
      setSessionCreations(creations);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        setSessionCreations([]);
      }
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title);
  };

  const handleSaveTitle = async (sessionId: string) => {
    if (!editTitleInput.trim()) return;
    try {
      await aiApi.updateSession(sessionId, editTitleInput);
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, title: editTitleInput } : s));
      setEditingSessionId(null);
      toast.success('Title updated');
    } catch {
      toast.error('Failed to update session title');
    }
  };

  const chatMutation = useMutation({
    mutationFn: ({ msgs, sessionId }: { msgs: AIMessage[]; sessionId: string }) =>
      aiApi.chat(
        msgs.map((m) => ({ role: m.role, content: m.content })),
        sessionId
      ) as Promise<{
        message: string;
        toolCalls: AIToolCall[];
      }>,
    onSuccess: (data, variables) => {
      const assistantMsg: AIMessage = {
        role: 'assistant',
        content: data.message ?? '(no response)',
        toolCalls: data.toolCalls ?? [],
        timestamp: new Date().toISOString(),
      };
      setMessages([...variables.msgs, assistantMsg]);

      // Track creations
      const creations = [...sessionCreations];
      data.toolCalls?.forEach((tc) => {
        const toolName = ((tc as unknown) as Record<string, unknown>).tool as string ?? tc.name;
        const result = tc.result as Record<string, unknown>;
        if (toolName === 'create_segment' && result?.segment_id) {
          creations.push({ type: 'segment', name: String(result?.name ?? 'Segment'), id: String(result.segment_id) });
        }
        if (toolName === 'create_campaign' && result?.campaign_id) {
          creations.push({ type: 'campaign', name: String(result?.name ?? 'Campaign'), id: String(result.campaign_id) });
        }
      });
      setSessionCreations(creations);
      loadSessions(false);
    },
    onError: () => {
      const errMsg: AIMessage = {
        role: 'assistant',
        content: 'Sorry, I ran into an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    },
  });

  const sendMessage = async (content: string) => {
    if (!content.trim() || chatMutation.isPending) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      try {
        const newSession = await aiApi.createSession() as ChatSession;
        targetSessionId = newSession.id;
        setActiveSessionId(targetSessionId);
        setSessions((prev) => [newSession, ...prev]);
      } catch {
        toast.error('Failed to initialize conversation');
        return;
      }
    }

    const userMsg: AIMessage = { role: 'user', content, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    chatMutation.mutate({ msgs: newMessages, sessionId: targetSessionId });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-88px)] gap-5 text-zinc-900 dark:text-zinc-100">
      {/* Sessions Sidebar */}
      <div className="w-64 shrink-0 flex flex-col rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Conversations
          </p>
          <button
            onClick={handleNewChat}
            className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors shadow-sm"
            title="New Conversation"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-white dark:bg-zinc-900">
          {sessions.length === 0 ? (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center py-10 italic">No past chats.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={cn(
                  "group flex items-center justify-between rounded-md px-2.5 py-2 text-xs cursor-pointer transition-all border",
                  activeSessionId === s.id
                    ? "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 border-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 hover:text-zinc-700 dark:hover:text-zinc-200"
                )}
              >
                {editingSessionId === s.id ? (
                  <input
                    value={editTitleInput}
                    onChange={(e) => setEditTitleInput(e.target.value)}
                    onBlur={() => handleSaveTitle(s.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle(s.id)}
                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-1 py-0.5 rounded outline-none text-zinc-800 dark:text-zinc-100 text-[11px]"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate pr-1 max-w-[140px]">{s.title || 'New Conversation'}</span>
                )}
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity ml-1 shrink-0">
                  <button
                    onClick={(e) => startEditing(s, e)}
                    className="text-zinc-400 dark:text-zinc-550 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    title="Rename"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="text-zinc-400 dark:text-zinc-550 hover:text-red-650 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex flex-1 flex-col rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 mb-4">
                <Bot size={20} className="text-zinc-400 dark:text-zinc-500" />
              </div>
              <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">AI Assistant</p>
              <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500 max-w-xs">
                Ask me to analyze customers, create segments, or launch campaigns in plain English.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-left text-xs text-zinc-600 dark:text-zinc-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {chatMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <Bot size={13} className="text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="pulse-dot h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-4">
          <div className="flex items-end gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 focus-within:border-blue-300 dark:focus-within:border-blue-800 focus-within:bg-white dark:focus-within:bg-zinc-900">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || chatMutation.isPending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Context panel */}
      <div className="w-64 shrink-0 space-y-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
            Created this session
          </p>
          {sessionCreations.length === 0 ? (
            <p className="text-xs text-zinc-300 dark:text-zinc-600">Nothing created yet. Ask AI to create a segment or campaign.</p>
          ) : (
            <div className="space-y-2">
              {sessionCreations.map((item, i) => (
                <Link
                  key={i}
                  href={`/${item.type}s/${item.id}`}
                  className="flex items-center justify-between rounded-md bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/25 border border-zinc-100 dark:border-zinc-800 shadow-sm dark:shadow-none"
                >
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300 capitalize text-[10px]">{item.type}</p>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[130px]">{item.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {messages.length > 0 && activeSessionId && (
          <button
            onClick={(e) => handleDeleteSession(activeSessionId, e)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 py-2 text-xs text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-red-500 hover:border-red-100 dark:hover:border-red-900 transition-colors"
          >
            <Trash2 size={12} /> Delete conversation
          </button>
        )}
      </div>
    </div>
  );
}
