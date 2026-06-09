import { Router } from 'express';
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  launchCampaign,
  getCampaignStats,
  getCampaignCommunications,
  streamCampaignStats,
} from '../../controllers/campaignsController';

const router = Router();

// GET /api/v1/campaigns?status=
router.get('/', getCampaigns);

// GET /api/v1/campaigns/:id
router.get('/:id', getCampaign);

// GET /api/v1/campaigns/:id/stats
router.get('/:id/stats', getCampaignStats);

// GET /api/v1/campaigns/:id/communications
router.get('/:id/communications', getCampaignCommunications);

// GET /api/v1/campaigns/:id/stream — SSE endpoint
router.get('/:id/stream', streamCampaignStats);

// POST /api/v1/campaigns
router.post('/', createCampaign);

// POST /api/v1/campaigns/:id/launch
router.post('/:id/launch', launchCampaign);

export default router;
