import axios from 'axios';
import { customerRepo } from '../repositories/customerRepo';
import { campaignRepo } from '../repositories/campaignRepo';
import { communicationRepo } from '../repositories/communicationRepo';
import { segmentRepo } from '../repositories/segmentRepo';
import logger from '../utils/logger';

function renderMessage(template: string, customer: Record<string, unknown>): string {
  return template
    .replace(/{{name}}/g, String(customer.name ?? 'Valued Customer'))
    .replace(/{{city}}/g, String(customer.city ?? 'your city'))
    .replace(/{{total_spend}}/g, `₹${Number(customer.total_spend ?? 0).toLocaleString('en-IN')}`)
    .replace(/{{order_count}}/g, String(customer.order_count ?? 0))
    .replace(/{{last_order}}/g, customer.last_order_at
      ? new Date(customer.last_order_at as string).toLocaleDateString('en-IN')
      : 'recently');
}

export const campaignService = {
  async launch(campaignId: string): Promise<void> {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
    if (!campaign.segment_id) throw new Error('Campaign has no segment');

    const segment = await segmentRepo.findById(campaign.segment_id);
    if (!segment) throw new Error(`Segment ${campaign.segment_id} not found`);

    const customers = await customerRepo.findForSegment(segment.rules);
    if (customers.length === 0) {
      logger.warn(`Campaign ${campaignId}: no customers matched segment`);
      await campaignRepo.updateStatus(campaignId, 'completed');
      return;
    }

    logger.info(`Campaign ${campaignId}: launching to ${customers.length} customers`);

    const commsData = customers.map((c) => ({
      campaign_id: campaignId,
      customer_id: c.id,
      message: renderMessage(campaign.message_template, c as unknown as Record<string, unknown>),
      status: 'queued' as const,
    }));

    const comms = await communicationRepo.bulkCreate(commsData);

    await campaignRepo.initStats(campaignId, customers.length);
    await campaignRepo.updateStatus(campaignId, 'running');

    const channelServiceUrl = process.env.CHANNEL_SERVICE_URL ?? 'http://localhost:3003';

    const sendPromises = comms.map(async (comm) => {
      const customer = customers.find((c) => c.id === comm.customer_id);
      try {
        await axios.post(`${channelServiceUrl}/send`, {
          communicationId: comm.id,
          channel: campaign.channel,
          recipient: {
            id: customer?.id ?? '',
            name: customer?.name ?? '',
            email: customer?.email ?? '',
            phone: customer?.phone ?? null,
          },
          message: comm.message,
          callbackUrl: `${process.env.BACKEND_URL ?? 'http://localhost:3001'}/api/v1/receipts`,
        });
      } catch (err) {
        logger.warn(`Failed to send message ${comm.id}: ${(err as Error).message}`);
      }
    });

    const batchSize = 50;
    for (let i = 0; i < sendPromises.length; i += batchSize) {
      await Promise.allSettled(sendPromises.slice(i, i + batchSize));
    }

    logger.info(`Campaign ${campaignId}: all messages queued`);
  },
};
