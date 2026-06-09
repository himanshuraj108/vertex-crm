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

// GET /api/v1/segments
router.get('/', getSegments);

// GET /api/v1/segments/:id
router.get('/:id', getSegment);

// GET /api/v1/segments/:id/customers
router.get('/:id/customers', getSegmentCustomers);

// POST /api/v1/segments
router.post('/', createSegment);

// POST /api/v1/segments/preview — preview rules without saving
router.post('/preview', previewSegment);

// PUT /api/v1/segments/:id
router.put('/:id', updateSegment);

// PATCH /api/v1/segments/:id (frontend uses patch)
router.patch('/:id', updateSegment);

// DELETE /api/v1/segments/:id
router.delete('/:id', deleteSegment);

export default router;
