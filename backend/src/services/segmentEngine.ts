import { Customer, SegmentRules } from '../types';
import { customerRepo } from '../repositories/customerRepo';
import { segmentRepo } from '../repositories/segmentRepo';

export const segmentEngine = {

  async evaluate(rules: SegmentRules): Promise<Customer[]> {
    return customerRepo.findForSegment(rules);
  },

  async count(rules: SegmentRules): Promise<number> {
    return customerRepo.countForSegment(rules);
  },

  async preview(
    rules: SegmentRules,
    previewLimit = 5
  ): Promise<{ count: number; sample: Customer[] }> {
    const [count, all] = await Promise.all([
      customerRepo.countForSegment(rules),
      customerRepo.findForSegment(rules),
    ]);
    return { count, sample: all.slice(0, previewLimit) };
  },

  async refreshAudienceSize(segmentId: string): Promise<number> {
    const segment = await segmentRepo.findById(segmentId);
    if (!segment) throw new Error(`Segment ${segmentId} not found`);

    const size = await customerRepo.countForSegment(segment.rules);
    await segmentRepo.updateAudienceSize(segmentId, size);
    return size;
  },
};
