import { supabase } from '../db/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  created_at: string;
  updated_at: string;
}

const inMemorySessions = new Map<string, ChatSession>();

function isTableMissingError(err: any): boolean {
  return err && (
    err.code === 'PGRST116' ||
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    err.message?.includes('relation "chat_sessions" does not exist') ||
    err.message?.includes('does not exist') ||
    err.message?.includes('Could not find the table') ||
    (typeof err.status === 'number' && err.status === 404)
  );
}

export const chatSessionRepo = {
  async findAll(): Promise<ChatSession[]> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          return Array.from(inMemorySessions.values()).sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        }
        throw new Error(error.message);
      }
      return (data ?? []) as ChatSession[];
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return Array.from(inMemorySessions.values()).sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }
      throw err;
    }
  },

  async findById(id: string): Promise<ChatSession | null> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          return inMemorySessions.get(id) ?? null;
        }
        return null;
      }
      return data as ChatSession;
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return inMemorySessions.get(id) ?? null;
      }
      return null;
    }
  },

  async create(title: string, messages: any[] = []): Promise<ChatSession> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const session: ChatSession = {
      id,
      title,
      messages,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert(session)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          inMemorySessions.set(id, session);
          return session;
        }
        throw new Error(error.message);
      }
      return data as ChatSession;
    } catch (err: any) {
      if (isTableMissingError(err)) {
        inMemorySessions.set(id, session);
        return session;
      }
      throw err;
    }
  },

  async update(id: string, updates: Partial<Pick<ChatSession, 'title' | 'messages'>>): Promise<ChatSession> {
    const now = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          const existing = inMemorySessions.get(id);
          if (!existing) throw new Error(`Chat session ${id} not found`);
          const updated = { ...existing, ...updates, updated_at: now };
          inMemorySessions.set(id, updated);
          return updated;
        }
        throw new Error(error.message);
      }
      return data as ChatSession;
    } catch (err: any) {
      if (isTableMissingError(err)) {
        const existing = inMemorySessions.get(id);
        if (!existing) throw new Error(`Chat session ${id} not found`);
        const updated = { ...existing, ...updates, updated_at: now };
        inMemorySessions.set(id, updated);
        return updated;
      }
      throw err;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', id);

      if (error) {
        if (isTableMissingError(error)) {
          inMemorySessions.delete(id);
          return;
        }
        throw new Error(error.message);
      }
    } catch (err: any) {
      if (isTableMissingError(err)) {
        inMemorySessions.delete(id);
        return;
      }
      throw err;
    }
  }
};
