import { supabase } from '../db/supabase';
import { Communication } from '../types';

export const communicationRepo = {
  async bulkCreate(
    comms: Array<{
      campaign_id: string;
      customer_id: string;
      message: string;
      status: 'queued';
    }>
  ): Promise<Communication[]> {
    const { data, error } = await supabase
      .from('communications')
      .insert(comms)
      .select();
    if (error) throw new Error(error.message);
    return (data ?? []) as Communication[];
  },

  async findById(id: string): Promise<Communication | null> {
    const { data, error } = await supabase
      .from('communications')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Communication;
  },

  async updateStatus(
    id: string,
    status: Communication['status'],
    timestamp?: Date
  ): Promise<void> {
    const tsField: Record<string, string> = {
      sent: 'sent_at',
      delivered: 'delivered_at',
      opened: 'opened_at',
      read: 'read_at',
      clicked: 'clicked_at',
    };

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (tsField[status] && timestamp) {
      updates[tsField[status]] = timestamp.toISOString();
    }

    const { error } = await supabase
      .from('communications')
      .update(updates)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
