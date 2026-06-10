/**
 * Global AI chat store — persists across page navigation.
 * The active stream continues running even when the user leaves the AI page.
 */
import { create } from 'zustand';
import { aiApi } from '@/lib/api-client';
import type { AIMessage, ChatSession, AIToolCall } from '@/types';

interface SessionCreation {
  type: string;
  name: string;
  id: string;
}

interface AIStore {
  // Session list
  sessions: ChatSession[];
  activeSessionId: string | null;

  // Messages for the active session
  messages: AIMessage[];

  // Streaming state (survives navigation)
  isStreaming: boolean;

  // Items created in current session (segments, campaigns)
  sessionCreations: SessionCreation[];

  // Actions
  setSessions: (sessions: ChatSession[]) => void;
  setActiveSessionId: (id: string | null) => void;
  setMessages: (messages: AIMessage[]) => void;
  setIsStreaming: (v: boolean) => void;
  setSessionCreations: (c: SessionCreation[]) => void;

  // High-level actions
  loadSessions: (selectLatest?: boolean) => Promise<void>;
  selectSession: (sessionId: string) => void;
  createSession: () => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const useAIStore = create<AIStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  sessionCreations: [],

  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setMessages: (messages) => set({ messages }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setSessionCreations: (c) => set({ sessionCreations: c }),

  loadSessions: async (selectLatest = false) => {
    try {
      const res = (await aiApi.getSessions()) as ChatSession[];
      set({ sessions: res });
      if (selectLatest && res.length > 0 && !get().activeSessionId) {
        get().selectSession(res[0].id);
      }
    } catch {}
  },

  selectSession: (sessionId: string) => {
    const { sessions } = get();
    set({ activeSessionId: sessionId });
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      set({ messages: session.messages || [] });
      const creations: SessionCreation[] = [];
      session.messages?.forEach((msg) => {
        msg.toolCalls?.forEach((tc) => {
          const raw = tc as unknown as Record<string, unknown>;
          const toolName = (raw.tool as string) ?? (raw.toolName as string) ?? tc.name;
          const result = tc.result as Record<string, unknown>;
          if (toolName === 'create_segment' && result?.segment_id) {
            creations.push({ type: 'segment', name: String(result?.name ?? 'Segment'), id: String(result.segment_id) });
          }
          if (toolName === 'create_campaign' && result?.campaign_id) {
            creations.push({ type: 'campaign', name: String(result?.name ?? 'Campaign'), id: String(result.campaign_id) });
          }
        });
      });
      set({ sessionCreations: creations });
    }
  },

  createSession: async () => {
    try {
      const newSession = (await aiApi.createSession()) as ChatSession;
      set((s) => ({
        activeSessionId: newSession.id,
        messages: [],
        sessionCreations: [],
        sessions: [newSession, ...s.sessions],
      }));
      return newSession.id;
    } catch (err) {
      throw err;
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await aiApi.deleteSession(sessionId);
      set((s) => {
        const nextSessions = s.sessions.filter((x) => x.id !== sessionId);
        const isCurrentActive = s.activeSessionId === sessionId;
        return {
          sessions: nextSessions,
          activeSessionId: isCurrentActive ? null : s.activeSessionId,
          messages: isCurrentActive ? [] : s.messages,
          sessionCreations: isCurrentActive ? [] : s.sessionCreations,
        };
      });
    } catch (err) {
      throw err;
    }
  },

  updateSessionTitle: async (sessionId: string, title: string) => {
    try {
      await aiApi.updateSession(sessionId, title);
      set((s) => ({
        sessions: s.sessions.map((x) => x.id === sessionId ? { ...x, title } : x),
      }));
    } catch (err) {
      throw err;
    }
  },

  sendMessage: async (content: string) => {
    const { isStreaming, activeSessionId, messages, sessionCreations } = get();
    if (!content.trim() || isStreaming) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      try {
        const newSession = (await aiApi.createSession()) as ChatSession;
        targetSessionId = newSession.id;
        set((s) => ({
          activeSessionId: targetSessionId,
          sessions: [newSession, ...s.sessions],
        }));
      } catch {
        return;
      }
    }

    const userMsg: AIMessage = { role: 'user', content, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    const assistantPlaceholder: AIMessage = {
      role: 'assistant',
      content: '',
      toolCalls: [],
      timestamp: new Date().toISOString(),
    };

    set({ messages: [...newMessages, assistantPlaceholder], isStreaming: true });

    try {
      const abortCtrl = new AbortController();
      const safetyTimer = setTimeout(() => abortCtrl.abort(), 45000);

      const response = await fetch(`${API_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId: targetSessionId,
        }),
        signal: abortCtrl.signal,
      });
      clearTimeout(safetyTimer);

      if (!response.ok || !response.body) throw new Error('Stream failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const creations: SessionCreation[] = [...sessionCreations];
      let isDone = false;

      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const rawData = line.slice(6).trim();
          if (!rawData) continue;

          let data: { type: string; content?: string; data?: Record<string, unknown> };
          try { data = JSON.parse(rawData); } catch { continue; }

          if (data.type === 'text_chunk') {
            set((s) => {
              const msgs = [...s.messages];
              const last = { ...msgs[msgs.length - 1] };
              last.content = (last.content ?? '') + (data.content ?? '');
              msgs[msgs.length - 1] = last;
              return { messages: msgs };
            });
          } else if (data.type === 'tool_call') {
            const tc = data.data!;
            set((s) => {
              const msgs = [...s.messages];
              const last = { ...msgs[msgs.length - 1] };
              last.toolCalls = [...(last.toolCalls ?? []), tc as unknown as AIToolCall];
              msgs[msgs.length - 1] = last;
              return { messages: msgs };
            });
            const toolName = (tc as Record<string, string>).toolName ?? (tc as Record<string, string>).tool;
            const result = tc as Record<string, unknown>;
            if (toolName === 'create_segment' && result?.segment_id) {
              creations.push({ type: 'segment', name: String(result?.name ?? 'Segment'), id: String(result.segment_id) });
            }
            if (toolName === 'create_campaign' && result?.campaign_id) {
              creations.push({ type: 'campaign', name: String(result?.name ?? 'Campaign'), id: String(result.campaign_id) });
            }
          } else if (data.type === 'done') {
            isDone = true;
            break;
          }
        }
      }

      try { reader.cancel(); } catch { /* ignore */ }

      set({ sessionCreations: creations });

      // Reload sessions after a delay so backend can save the generated title
      setTimeout(async () => {
        await get().loadSessions(false);
      }, 1500);
    } catch {
      set((s) => {
        const msgs = [...s.messages];
        const last = { ...msgs[msgs.length - 1] };
        last.content = 'Sorry, I ran into an error. Please try again.';
        msgs[msgs.length - 1] = last;
        return { messages: msgs };
      });
    } finally {
      set({ isStreaming: false });
    }
  },
}));
