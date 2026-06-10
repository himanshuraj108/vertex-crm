import { Request, Response } from 'express';
import { z } from 'zod';
import { segmentRepo } from '../repositories/segmentRepo';
import { segmentEngine } from '../services/segmentEngine';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { SegmentRules } from '../types';

const ConditionSchema = z.object({
  field: z.enum([
    'total_spend',
    'order_count',
    'city',
    'gender',
    'days_since_last_order',
    'visit_count',
  ]),
  operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq', 'neq', 'in']),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

const SegmentRulesSchema = z.object({
  logic: z.enum(['AND', 'OR']),
  conditions: z.array(ConditionSchema).min(1),
});

const CreateSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  rules: SegmentRulesSchema,
  ai_generated: z.boolean().optional().default(false),
});

const UpdateSegmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  rules: SegmentRulesSchema.optional(),
});

const PreviewSegmentSchema = z.object({
  rules: SegmentRulesSchema,
});

export const getSegments = asyncHandler(async (_req: Request, res: Response) => {
  const segments = await segmentRepo.findAll();
  res.json({ success: true, data: segments });
});

export const getSegment = asyncHandler(async (req: Request, res: Response) => {
  const segment = await segmentRepo.findById(req.params.id);
  if (!segment) throw ApiError.notFound(`Segment ${req.params.id} not found`);
  res.json({ success: true, data: segment });
});

export const createSegment = asyncHandler(async (req: Request, res: Response) => {
  const data = CreateSegmentSchema.parse(req.body);

  const audienceSize = await segmentEngine.count(data.rules as SegmentRules);

  const segment = await segmentRepo.create({
    name: data.name,
    description: data.description ?? null,
    rules: data.rules,
    audience_size: audienceSize,
    ai_generated: data.ai_generated,
  });

  res.status(201).json({ success: true, data: segment });
});

export const updateSegment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await segmentRepo.findById(id);
  if (!existing) throw ApiError.notFound(`Segment ${id} not found`);

  const data = UpdateSegmentSchema.parse(req.body);

  let audienceSize: number | undefined;
  if (data.rules) {
    audienceSize = await segmentEngine.count(data.rules as SegmentRules);
  }

  const updated = await segmentRepo.update(id, {
    name: data.name,
    description: data.description,
    rules: data.rules,
    audience_size: audienceSize,
  });

  res.json({ success: true, data: updated });
});

export const deleteSegment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await segmentRepo.findById(id);
  if (!existing) throw ApiError.notFound(`Segment ${id} not found`);

  await segmentRepo.delete(id);
  res.json({ success: true, message: 'Segment deleted successfully' });
});

export const previewSegment = asyncHandler(async (req: Request, res: Response) => {
  const { rules } = PreviewSegmentSchema.parse(req.body);

  const { count, sample } = await segmentEngine.preview(rules as SegmentRules, 5);

  res.json({
    success: true,
    data: {
      count,
      sample,
    },
  });
});

export const getSegmentCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const segment = await segmentRepo.findById(id);
  if (!segment) throw ApiError.notFound(`Segment ${id} not found`);

  const allCustomers = await segmentEngine.evaluate(segment.rules);
  const total = allCustomers.length;
  const start = (page - 1) * limit;
  const data = allCustomers.slice(start, start + limit);

  res.json({
    success: true,
    data: {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});
