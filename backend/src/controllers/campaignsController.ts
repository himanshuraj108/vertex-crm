import { Request, Response } from 'express';
import { z } from 'zod';
import { campaignRepo } from '../repositories/campaignRepo';
import { campaignService } from '../services/campaignService';
import { sseService } from '../services/sseService';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  segment_id: z.string().uuid().nullable().optional().or(z.literal('')),
  segmentId: z.string().uuid().nullable().optional().or(z.literal('')),
  channel: z.enum(['whatsapp', 'sms', 'email', 'rcs']),
  message_template: z.string().min(1).max(4000).optional(),
  messageTemplate: z.string().min(1).max(4000).optional(),
});

export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const status = (req.query.status as string) || undefined;
  const campaigns = await campaignRepo.findAll(status);
  res.json({ success: true, data: campaigns });
});

export const getCampaign = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignRepo.findById(req.params.id);
  if (!campaign) throw ApiError.notFound(`Campaign ${req.params.id} not found`);
  res.json({ success: true, data: campaign });
});

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const data = CreateCampaignSchema.parse(req.body);

  let segmentId = data.segment_id ?? data.segmentId ?? undefined;
  if (segmentId === '') {
    segmentId = undefined;
  }

  const messageTemplate = data.message_template ?? data.messageTemplate;
  if (!messageTemplate) {
    throw ApiError.badRequest('message_template or messageTemplate is required');
  }

  const campaign = await campaignRepo.create({
    name: data.name,
    segment_id: segmentId ?? undefined,
    channel: data.channel,
    message_template: messageTemplate,
  });
  res.status(201).json({ success: true, data: campaign });
});

export const launchCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = await campaignRepo.findById(id);
  if (!campaign) throw ApiError.notFound(`Campaign ${id} not found`);

  res.json({
    success: true,
    message: 'Campaign launch initiated',
    data: { campaign_id: id },
  });

  campaignService.launch(id).catch((err: Error) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Campaign ${id} launch failed:`, message);
  });
});

export const getCampaignStats = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = await campaignRepo.findById(id);
  if (!campaign) throw ApiError.notFound(`Campaign ${id} not found`);

  const stats = await campaignRepo.findStats(id);
  res.json({ success: true, data: stats ?? { campaign_id: id, total: 0, sent: 0, delivered: 0, failed: 0, opened: 0, read_count: 0, clicked: 0, orders_attributed: 0 } });
});

export const getCampaignCommunications = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const campaign = await campaignRepo.findById(id);
  if (!campaign) throw ApiError.notFound(`Campaign ${id} not found`);

  const result = await campaignRepo.findCommunications(id, page, limit);
  res.json({
    success: true,
    data: {
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

export const streamCampaignStats = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = await campaignRepo.findById(id);
  if (!campaign) throw ApiError.notFound(`Campaign ${id} not found`);

  sseService.addClient(id, res);

  const stats = await campaignRepo.findStats(id);
  if (stats) {
    res.write(`event: stats_update\ndata: ${JSON.stringify(stats)}\n\n`);
  }

  req.on('close', () => {
    sseService.removeClient(id, res);
  });

  req.on('aborted', () => {
    sseService.removeClient(id, res);
  });
});
