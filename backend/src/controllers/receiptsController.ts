import { Request, Response } from 'express';
import { z } from 'zod';
import { receiptService } from '../services/receiptService';
import { asyncHandler } from '../utils/asyncHandler';

// ─── Validation Schema ────────────────────────────────────────────────────────

const ReceiptSchema = z.object({
  communicationId: z.string().uuid(),
  status: z.enum(['sent', 'delivered', 'failed', 'opened', 'read', 'clicked']),
  timestamp: z.string().datetime().optional(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const processReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { communicationId, status, timestamp } = ReceiptSchema.parse(req.body);

  const ts = timestamp ? new Date(timestamp) : new Date();

  await receiptService.process(communicationId, status, ts);

  res.json({
    success: true,
    message: `Receipt processed: ${communicationId} → ${status}`,
  });
});
