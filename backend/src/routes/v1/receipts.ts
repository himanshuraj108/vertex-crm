import { Router } from 'express';
import { processReceipt } from '../../controllers/receiptsController';

const router = Router();

router.post('/', processReceipt);

export default router;
