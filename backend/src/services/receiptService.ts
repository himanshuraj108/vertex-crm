import { supabase } from '../db/supabase';
import { communicationRepo } from '../repositories/communicationRepo';
import { campaignRepo } from '../repositories/campaignRepo';
import { sseService } from './sseService';
import logger from '../utils/logger';

export const receiptService = {
  async process(commId: string, status: string, timestamp?: Date): Promise<void> {
    const comm = await communicationRepo.findById(commId);
    if (!comm) {
      logger.warn(`Receipt for unknown communication: ${commId}`);
      return;
    }

    const validStatuses = ['sent', 'delivered', 'failed', 'opened', 'read', 'clicked'];
    if (!validStatuses.includes(status)) {
      logger.warn(`Invalid receipt status: ${status}`);
      return;
    }

    // Update communication status
    await communicationRepo.updateStatus(
      commId,
      status as 'sent' | 'delivered' | 'failed' | 'opened' | 'read' | 'clicked',
      timestamp ?? new Date()
    );

    // Map status → stats field
    const statFieldMap: Record<string, 'sent' | 'delivered' | 'failed' | 'opened' | 'read_count' | 'clicked'> = {
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
      opened: 'opened',
      read: 'read_count',
      clicked: 'clicked',
    };

    const statField = statFieldMap[status];
    if (statField) {
      await campaignRepo.incrementStat(comm.campaign_id, statField);

      // 12% chance to attribute an order on click
      if (status === 'clicked' && Math.random() < 0.12) {
        await campaignRepo.incrementStat(comm.campaign_id, 'orders_attributed');
      }
    }

    // Broadcast updated stats via SSE
    const updatedStats = await campaignRepo.findStats(comm.campaign_id);
    if (updatedStats) {
      sseService.broadcastStats(comm.campaign_id, updatedStats);
    }

    // Check if campaign is complete
    if (['delivered', 'failed', 'clicked', 'read', 'opened'].includes(status)) {
      const allDone = await campaignRepo.checkAllTerminal(comm.campaign_id);
      if (allDone) {
        await campaignRepo.updateStatus(comm.campaign_id, 'completed');
        logger.info(`Campaign ${comm.campaign_id} marked as completed`);
      }
    }
  },
};
