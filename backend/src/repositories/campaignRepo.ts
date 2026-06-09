import { supabase } from '../db/supabase';
import { Campaign, CampaignStats } from '../types';

export const campaignRepo = {
  async findAll(status?: string): Promise<Campaign[]> {
    let q = supabase
      .from('campaigns')
      .select(`*, segments(name), campaign_stats(*)`)
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      segment_name: (c.segments as { name: string } | null)?.name ?? null,
      stats: c.campaign_stats ?? null,
    })) as unknown as Campaign[];
  },

  async findById(id: string): Promise<Campaign | null> {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`*, segments(name), campaign_stats(*)`)
      .eq('id', id)
      .single();
    if (error) return null;
    return {
      ...data,
      segment_name: (data.segments as { name: string } | null)?.name ?? null,
      stats: data.campaign_stats as CampaignStats | null,
    } as Campaign;
  },

  async create(camp: {
    name: string;
    segment_id?: string;
    channel: string;
    message_template: string;
  }): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ ...camp, status: 'draft' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Campaign;
  },

  async updateStatus(id: string, status: Campaign['status']): Promise<void> {
    const updates: Record<string, unknown> = { status };
    if (status === 'running') updates.launched_at = new Date().toISOString();
    const { error } = await supabase.from('campaigns').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async findStats(campaignId: string): Promise<CampaignStats | null> {
    const { data, error } = await supabase
      .from('campaign_stats')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();
    if (error) return null;
    return data as CampaignStats;
  },

  async initStats(campaignId: string, total: number): Promise<void> {
    const { error } = await supabase.from('campaign_stats').upsert({
      campaign_id: campaignId,
      total,
      sent: 0, delivered: 0, failed: 0,
      opened: 0, read_count: 0, clicked: 0,
      orders_attributed: 0,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  },

  async incrementStat(
    campaignId: string,
    field: 'sent' | 'delivered' | 'failed' | 'opened' | 'read_count' | 'clicked' | 'orders_attributed'
  ): Promise<void> {
    // Fetch current, increment, update
    const current = await this.findStats(campaignId);
    if (!current) return;
    const { error } = await supabase
      .from('campaign_stats')
      .update({
        [field]: (current[field] as number) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('campaign_id', campaignId);
    if (error) throw new Error(error.message);
  },

  async findCommunications(campaignId: string, page = 1, limit = 20) {
    const { data, error, count } = await supabase
      .from('communications')
      .select(`*, customers(name, email, city)`, { count: 'exact' })
      .eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error(error.message);
    const mapped = (data ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      customer_name: (c.customers as { name: string } | null)?.name ?? null,
    }));
    return { data: mapped, total: count ?? 0 };
  },

  async checkAllTerminal(campaignId: string): Promise<boolean> {
    const { count } = await supabase
      .from('communications')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('status', ['queued', 'sent']);
    return (count ?? 0) === 0;
  },
};
