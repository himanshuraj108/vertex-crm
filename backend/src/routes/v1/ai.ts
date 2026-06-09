import { Router } from 'express';
import {
  chat,
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

// Sessions CRUD endpoints
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);
router.post('/sessions', createSession);
router.patch('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

// POST /api/v1/ai/chat
// Multi-turn agent with function calling
router.post('/chat', chat);

// POST /api/v1/ai/parse-segment
// Convert natural language to segment rules
router.post('/parse-segment', parseSegment);

// POST /api/v1/ai/draft-message
// Generate campaign message template
router.post('/draft-message', draftMessage);

// POST /api/v1/ai/analyze-campaign
// Get AI insights for a campaign
router.post('/analyze-campaign', analyzeCampaignHandler);

// GET /api/v1/ai/suggest-segments
// Get proactive segment suggestions based on current data
router.get('/suggest-segments', suggestSegmentsHandler);

export default router;
