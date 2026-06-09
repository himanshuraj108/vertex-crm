import { Response } from 'express';
import { CampaignStats } from '../types';
import logger from '../utils/logger';

/**
 * SSE (Server-Sent Events) Manager
 *
 * Maintains a registry of open SSE connections keyed by campaignId.
 * Used to push real-time campaign stats updates to the frontend.
 */
class SseService {
  // campaignId → Set of Express Response objects (SSE clients)
  private clients: Map<string, Set<Response>> = new Map();

  /**
   * Register a new SSE client for a campaign.
   * Sets the appropriate headers and sends an initial ping.
   */
  addClient(campaignId: string, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial connection acknowledgment
    res.write(`event: connected\ndata: ${JSON.stringify({ campaignId })}\n\n`);

    if (!this.clients.has(campaignId)) {
      this.clients.set(campaignId, new Set());
    }
    this.clients.get(campaignId)!.add(res);

    logger.debug(`SSE client connected for campaign ${campaignId} — total: ${this.clients.get(campaignId)!.size}`);
  }

  /**
   * Remove an SSE client (e.g., on disconnect).
   */
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

  /**
   * Broadcast arbitrary data to all clients subscribed to a campaign.
   */
  broadcast(campaignId: string, eventName: string, data: unknown): void {
    const set = this.clients.get(campaignId);
    if (!set || set.size === 0) return;

    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    const toRemove: Response[] = [];

    for (const res of set) {
      try {
        res.write(payload);
      } catch {
        // Client disconnected without calling removeClient
        toRemove.push(res);
      }
    }

    for (const res of toRemove) {
      this.removeClient(campaignId, res);
    }
  }

  /**
   * Broadcast a campaign stats update to all subscribers.
   */
  broadcastStats(campaignId: string, stats: CampaignStats): void {
    this.broadcast(campaignId, 'stats_update', stats);
  }

  /**
   * Return the number of active clients for a campaign.
   */
  getClientCount(campaignId: string): number {
    return this.clients.get(campaignId)?.size ?? 0;
  }
}

// Singleton exported for use across services and controllers
export const sseService = new SseService();
