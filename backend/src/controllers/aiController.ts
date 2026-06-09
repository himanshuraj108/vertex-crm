import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import {
  chatWithAgent,
  parseSegmentFromNL,
  draftCampaignMessage,
  analyzeCampaign,
  suggestSegments,
  ChatMessage,
  generateChatTitle,
} from '../services/groqService';
import { chatSessionRepo } from '../repositories/chatSessionRepo';
import { customerRepo } from '../repositories/customerRepo';
import { segmentRepo } from '../repositories/segmentRepo';
import { campaignRepo } from '../repositories/campaignRepo';
import { segmentEngine } from '../services/segmentEngine';
import { campaignService } from '../services/campaignService';
import { supabase } from '../db/supabase';
import { SegmentRules } from '../types';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'tool']),
        content: z.string().nullable(),
        tool_call_id: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .min(1),
  conversationId: z.string().optional(),
});

const ParseSegmentSchema = z.object({
  description: z.string().min(5).max(1000),
});

const DraftMessageSchema = z.object({
  segmentDescription: z.string().min(5).max(500),
  channel: z.enum(['whatsapp', 'sms', 'email', 'rcs']),
  brandVoice: z.string().optional(),
});

const AnalyzeCampaignSchema = z.object({
  campaignId: z.string().uuid(),
});

// ─── Tool Executor ────────────────────────────────────────────────────────────

/**
 * Executes AI agent tool calls against real database/services.
 * This is the bridge between Groq function calls and the actual backend.
 */
async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'query_customers': {
      const {
        city,
        gender,
        min_spend,
        max_spend,
        days_since_last_order_gt,
        order_count_gte,
      } = args as {
        city?: string;
        gender?: string;
        min_spend?: number;
        max_spend?: number;
        days_since_last_order_gt?: number;
        order_count_gte?: number;
      };

      const conditions: SegmentRules['conditions'] = [];

      if (city && city.trim() !== '') conditions.push({ field: 'city', operator: 'eq', value: city });
      if (gender && gender.trim() !== '')
        conditions.push({
          field: 'gender',
          operator: 'eq',
          value: gender,
        });
      if (min_spend !== undefined && min_spend > 0)
        conditions.push({ field: 'total_spend', operator: 'gte', value: min_spend });
      if (max_spend !== undefined && max_spend > 0)
        conditions.push({ field: 'total_spend', operator: 'lte', value: max_spend });
      if (days_since_last_order_gt !== undefined && days_since_last_order_gt > 0)
        conditions.push({
          field: 'days_since_last_order',
          operator: 'gt',
          value: days_since_last_order_gt,
        });
      if (order_count_gte !== undefined && order_count_gte > 0)
        conditions.push({ field: 'order_count', operator: 'gte', value: order_count_gte });

      const rules: SegmentRules =
        conditions.length > 0
          ? { logic: 'AND', conditions }
          : { logic: 'AND', conditions: [{ field: 'order_count', operator: 'gte', value: 0 }] };

      const customers = await customerRepo.findForSegment(rules);
      return {
        count: customers.length,
        customers: customers.slice(0, 10).map((c) => ({
          id: c.id,
          name: c.name,
          city: c.city,
          total_spend: c.total_spend,
          order_count: c.order_count,
          last_order_at: c.last_order_at,
        })),
        note: customers.length > 10 ? `Showing 10 of ${customers.length} results` : undefined,
      };
    }

    case 'create_segment': {
      const { name, description, rules } = args as {
        name: string;
        description?: string;
        rules: SegmentRules;
      };
      const audienceSize = await segmentEngine.count(rules);
      const segment = await segmentRepo.create({
        name,
        description: description ?? null,
        rules,
        audience_size: audienceSize,
        ai_generated: true,
      });
      return { segment_id: segment.id, name: segment.name, audience_size: audienceSize };
    }

    case 'preview_segment': {
      const { rules } = args as { rules: SegmentRules };
      const { count, sample } = await segmentEngine.preview(rules, 3);
      return {
        count,
        sample: sample.map((c) => ({ name: c.name, city: c.city, total_spend: c.total_spend })),
      };
    }

    case 'create_campaign': {
      const { name, segment_id, channel, message_template } = args as {
        name: string;
        segment_id: string;
        channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
        message_template: string;
      };
      const campaign = await campaignRepo.create({
        name,
        segment_id,
        channel,
        message_template,
      });
      return { campaign_id: campaign.id, name: campaign.name, status: campaign.status };
    }

    case 'launch_campaign': {
      const { campaign_id } = args as { campaign_id: string };
      // Fire-and-forget
      campaignService.launch(campaign_id).catch((err: Error) => {
        console.error(`AI-initiated campaign launch failed: ${err.message}`);
      });
      return { message: `Campaign ${campaign_id} launch initiated`, status: 'running' };
    }

    case 'get_campaign_stats': {
      const { campaign_id } = args as { campaign_id: string };
      const stats = await campaignRepo.findStats(campaign_id);
      if (!stats) return { error: 'Campaign stats not found' };
      return stats;
    }

    case 'get_analytics_summary': {
      const [custRes, campRes, ordRes, statsRes] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('campaigns').select('status'),
        supabase.from('orders').select('amount'),
        supabase.from('campaign_stats').select('total,delivered'),
      ]);
      const totalRevenue = (ordRes.data ?? []).reduce(
        (s: number, o: { amount: number }) => s + Number(o.amount), 0
      );
      const allStats = statsRes.data ?? [];
      const totSent = allStats.reduce((s: number, r: Record<string, number>) => s + (r.total || 0), 0);
      const totDel = allStats.reduce((s: number, r: Record<string, number>) => s + (r.delivered || 0), 0);

      const campaigns = campRes.data ?? [];
      const totalCampaigns = campaigns.length;
      const campaignsByStatus = campaigns.reduce((acc: Record<string, number>, c: { status: string }) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, { draft: 0, running: 0, completed: 0, failed: 0 });

      return {
        total_customers: custRes.count ?? 0,
        total_campaigns: totalCampaigns,
        campaigns_by_status: campaignsByStatus,
        total_revenue_inr: totalRevenue,
        avg_delivery_rate_pct: totSent > 0 ? Math.round((totDel / totSent) * 1000) / 10 : 0,
      };
    }

    case 'list_campaigns': {
      const { status } = args as { status?: string };
      const campaigns = await campaignRepo.findAll(status);
      return {
        count: campaigns.length,
        campaigns: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          channel: c.channel,
          segment_name: c.segment_name,
          created_at: c.created_at,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const { messages, conversationId } = ChatSchema.parse(req.body);

  const { message, toolCalls } = await chatWithAgent(
    messages as ChatMessage[],
    executeToolCall
  );

  const mappedToolCalls = toolCalls.map((tc) => ({
    tool: tc.toolName,
    args: tc.args,
    result: tc.result,
  }));

  // If session tracking is active, save to DB/memory
  if (conversationId) {
    const session = await chatSessionRepo.findById(conversationId);
    if (session) {
      const lastUserMsg = messages[messages.length - 1];
      const assistantMsg = {
        role: 'assistant',
        content: message,
        toolCalls: mappedToolCalls,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [
        ...session.messages,
        { ...lastUserMsg, timestamp: new Date().toISOString() },
        assistantMsg
      ];

      // Auto-generate title if session has no title or has 0 messages
      let updatedTitle = session.title;
      if (session.title === 'New Conversation' || !session.title || session.messages.length === 0) {
        updatedTitle = await generateChatTitle(lastUserMsg.content || '');
      }

      await chatSessionRepo.update(conversationId, {
        title: updatedTitle,
        messages: updatedMessages
      });
    }
  }

  res.json({
    success: true,
    data: {
      message,
      toolCalls: mappedToolCalls,
    },
  });
});

export const parseSegment = asyncHandler(async (req: Request, res: Response) => {
  const { description } = ParseSegmentSchema.parse(req.body);

  const parsed = await parseSegmentFromNL(description);

  // Evaluate the audience size for the generated rules
  const count = await segmentEngine.count(parsed.rules);

  res.json({
    success: true,
    data: {
      rules: parsed.rules,
      name: parsed.name,
      audienceSize: count,
      description,
    },
  });
});

export const draftMessage = asyncHandler(async (req: Request, res: Response) => {
  const { segmentDescription, channel } = DraftMessageSchema.parse(req.body);

  const messageTemplate = await draftCampaignMessage(
    segmentDescription,
    channel
  );

  res.json({
    success: true,
    data: {
      messageTemplate,
      channel,
      variables: ['{{name}}', '{{city}}', '{{last_order}}', '{{total_spend}}'],
    },
  });
});

export const analyzeCampaignHandler = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = AnalyzeCampaignSchema.parse(req.body);

  const campaign = await campaignRepo.findById(campaignId);
  if (!campaign) throw ApiError.notFound(`Campaign ${campaignId} not found`);

  const stats = await campaignRepo.findStats(campaignId);
  if (!stats) {
    throw ApiError.badRequest('No stats available for this campaign yet', 'NO_STATS');
  }

  const insights = await analyzeCampaign(
    stats,
    campaign.segment_name ?? 'Unknown Segment',
    campaign.channel
  );

  res.json({
    success: true,
    data: {
      campaignId,
      campaignName: campaign.name,
      stats,
      insights,
      analysis: insights,
    },
  });
});

export const suggestSegmentsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const [custRes, cityRes] = await Promise.all([
    supabase.from('customers').select('total_spend,order_count'),
    supabase.from('customers').select('city').not('city', 'is', null),
  ]);

  const custData = custRes.data ?? [];
  const totalCustomers = custData.length;
  const avgSpend = totalCustomers > 0
    ? custData.reduce((s: number, r: { total_spend: number }) => s + Number(r.total_spend), 0) / totalCustomers
    : 0;
  const avgOrderCount = totalCustomers > 0
    ? custData.reduce((s: number, r: { order_count: number }) => s + Number(r.order_count), 0) / totalCustomers
    : 0;
  const cities = [...new Set((cityRes.data ?? []).map((r: { city: string }) => r.city))].sort();

  const stats = { totalCustomers, avgSpend, avgOrderCount, cities };

  const suggestions = await suggestSegments(stats);

  // Enrich segment suggestions with audience sizes
  const enriched = await Promise.all(
    suggestions.segments.map(async (s) => {
      let audienceSize = 0;
      try {
        audienceSize = await segmentEngine.count(s.rules);
      } catch {
        audienceSize = 0;
      }
      return { ...s, audienceSize };
    })
  );

  res.json({
    success: true,
    data: { insight: suggestions.insight, segments: enriched },
  });
});

// ─── Chat Sessions CRUD ───────────────────────────────────────────────────────

export const getSessions = asyncHandler(async (_req: Request, res: Response) => {
  const sessions = await chatSessionRepo.findAll();
  res.json({ success: true, data: sessions });
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await chatSessionRepo.findById(req.params.id);
  if (!session) throw ApiError.notFound(`Chat session ${req.params.id} not found`);
  res.json({ success: true, data: session });
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const { title } = z.object({ title: z.string().optional() }).parse(req.body);
  const session = await chatSessionRepo.create(title ?? 'New Conversation', []);
  res.status(201).json({ success: true, data: session });
});

export const updateSession = asyncHandler(async (req: Request, res: Response) => {
  const { title } = z.object({ title: z.string() }).parse(req.body);
  const session = await chatSessionRepo.update(req.params.id, { title });
  res.json({ success: true, data: session });
});

export const deleteSession = asyncHandler(async (req: Request, res: Response) => {
  await chatSessionRepo.delete(req.params.id);
  res.json({ success: true, message: 'Chat session deleted successfully' });
});
