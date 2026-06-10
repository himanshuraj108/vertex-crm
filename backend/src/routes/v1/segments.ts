import { Router } from 'express';
import {
  getSegments,
  getSegment,
  createSegment,
  updateSegment,
  deleteSegment,
  previewSegment,
  getSegmentCustomers,
} from '../../controllers/segmentsController';

const router = Router();

router.get('/', getSegments);

router.get('/:id', getSegment);

router.get('/:id/customers', getSegmentCustomers);

router.post('/', createSegment);

router.post('/preview', previewSegment);

router.put('/:id', updateSegment);

router.patch('/:id', updateSegment);

router.delete('/:id', deleteSegment);

export default router;
