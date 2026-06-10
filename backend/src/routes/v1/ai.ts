import { Router } from 'express';
import {
  chat,
  chatStream,
  parseSegment,
  draftMessage,
  analyzeCampaignHandler,
  suggestSegmentsHandler,
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
} from '../../controllers/aiController';

const router = Router();

router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);
router.post('/sessions', createSession);
router.patch('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

router.post('/chat', chat);
router.post('/chat/stream', chatStream);

router.post('/parse-segment', parseSegment);

router.post('/draft-message', draftMessage);

router.post('/analyze-campaign', analyzeCampaignHandler);

router.get('/suggest-segments', suggestSegmentsHandler);

export default router;
