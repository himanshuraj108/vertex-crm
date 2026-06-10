import { Response } from 'express';
import { CampaignStats } from '../types';
import logger from '../utils/logger';

class SseService {

  private clients: Map<string, Set<Response>> = new Map();

  addClient(campaignId: string, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(`event: connected\ndata: ${JSON.stringify({ campaignId })}\n\n`);

    if (!this.clients.has(campaignId)) {
      this.clients.set(campaignId, new Set());
    }
    this.clients.get(campaignId)!.add(res);

    logger.debug(`SSE client connected for campaign ${campaignId} — total: ${this.clients.get(campaignId)!.size}`);
  }

  removeClient(campaignId: string, res: Response): void {
    const set = this.clients.get(campaignId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        this.clients.delete(campaignId);
      }
      logger.debug(`SSE client disconnected for campaign ${campaignId}`);
    }
  }

  broadcast(campaignId: string, eventName: string, data: unknown): void {
    const set = this.clients.get(campaignId);
    if (!set || set.size === 0) return;

    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    const toRemove: Response[] = [];

    for (const res of set) {
      try {
        res.write(payload);
      } catch {

        toRemove.push(res);
      }
    }

    for (const res of toRemove) {
      this.removeClient(campaignId, res);
    }
  }

  broadcastStats(campaignId: string, stats: CampaignStats): void {
    this.broadcast(campaignId, 'stats_update', stats);
  }

  getClientCount(campaignId: string): number {
    return this.clients.get(campaignId)?.size ?? 0;
  }
}

export const sseService = new SseService();
