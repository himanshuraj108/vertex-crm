import { Request, Response } from 'express';
import { z } from 'zod';
import { customerRepo } from '../repositories/customerRepo';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
});

const ImportCustomersSchema = z.object({
  customers: z
    .array(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        gender: z.enum(['male', 'female', 'other']).nullable().optional(),
        total_spend: z.number().nonnegative().optional(),
        order_count: z.number().int().nonnegative().optional(),
        visit_count: z.number().int().nonnegative().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .min(1)
    .max(5000),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getCustomers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const search = (req.query.search as string) || undefined;
  const city = (req.query.city as string) || undefined;
  const gender = (req.query.gender as string) || undefined;

  const result = await customerRepo.findAll(page, limit, search, city, gender);

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

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = await customerRepo.findById(id);

  if (!customer) {
    throw ApiError.notFound(`Customer ${id} not found`);
  }

  res.json({ success: true, data: customer });
});

export const getCustomerOrders = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const customer = await customerRepo.findById(id);
  if (!customer) {
    throw ApiError.notFound(`Customer ${id} not found`);
  }

  const result = await customerRepo.findOrders(id, page, limit);
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

export const getCustomerCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const customer = await customerRepo.findById(id);
  if (!customer) {
    throw ApiError.notFound(`Customer ${id} not found`);
  }

  const campaigns = await customerRepo.findCampaigns(id);
  res.json({ success: true, data: campaigns });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data = CreateCustomerSchema.parse(req.body);
  const customer = await customerRepo.create({
    ...data,
    city: data.city ?? null,
    phone: data.phone ?? null,
    gender: data.gender ?? null,
    total_spend: 0,
    order_count: 0,
    visit_count: 0,
    last_order_at: null,
    tags: data.tags ?? [],
  });
  res.status(201).json({ success: true, data: customer });
});

export const importCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { customers } = ImportCustomersSchema.parse(req.body);
  const withDefaults = customers.map((c) => ({
    ...c,
    total_spend: c.total_spend ?? 0,
    order_count: c.order_count ?? 0,
    visit_count: c.visit_count ?? 0,
    last_order_at: null,
    tags: c.tags ?? [],
    phone: c.phone ?? null,
    city: c.city ?? null,
    gender: c.gender ?? null,
  }));
  const inserted = await customerRepo.bulkCreate(withDefaults);

  res.status(201).json({
    success: true,
    data: { submitted: customers.length, inserted, skipped: customers.length - inserted },
  });
});
