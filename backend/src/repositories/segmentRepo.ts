import { supabase } from '../db/supabase';
import { Segment } from '../types';

export const segmentRepo = {
  async findAll(): Promise<Segment[]> {
    const { data, error } = await supabase
      .from('segments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Segment[];
  },

  async findById(id: string): Promise<Segment | null> {
    const { data, error } = await supabase
      .from('segments')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Segment;
  },

  async create(seg: {
    name: string;
    description: string | null;
    rules: object;
    audience_size: number;
    ai_generated: boolean;
  }): Promise<Segment> {
    const { data, error } = await supabase
      .from('segments')
      .insert(seg)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Segment;
  },

  async update(id: string, updates: Partial<Segment>): Promise<Segment> {
    const { data, error } = await supabase
      .from('segments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Segment;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('segments').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updateAudienceSize(id: string, size: number): Promise<void> {
    const { error } = await supabase
      .from('segments')
      .update({ audience_size: size, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
