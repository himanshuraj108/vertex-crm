import { Router } from 'express';
import { processReceipt } from '../../controllers/receiptsController';

const router = Router();

// POST /api/v1/receipts
// Called by the channel service with delivery status callbacks
router.post('/', processReceipt);

export default router;
