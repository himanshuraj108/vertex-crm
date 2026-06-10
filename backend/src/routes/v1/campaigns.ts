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

router.get('/', getCampaigns);

router.get('/:id', getCampaign);

router.get('/:id/stats', getCampaignStats);

router.get('/:id/communications', getCampaignCommunications);

router.get('/:id/stream', streamCampaignStats);

router.post('/', createCampaign);

router.post('/:id/launch', launchCampaign);

export default router;
