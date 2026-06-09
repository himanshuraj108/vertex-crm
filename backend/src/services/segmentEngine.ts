import { Customer, SegmentRules } from '../types';
import { customerRepo } from '../repositories/customerRepo';
import { segmentRepo } from '../repositories/segmentRepo';

/**
 * Segment Engine Service
 *
 * Converts SegmentRules into optimized PostgreSQL WHERE clauses
 * via the customerRepo and evaluates them against the database.
 *
 * All SQL is generated and executed inside customerRepo;
 * this service orchestrates higher-level segment operations.
 */
export const segmentEngine = {
  /**
   * Return all customers matching the given segment rules.
   */
  async evaluate(rules: SegmentRules): Promise<Customer[]> {
    return customerRepo.findForSegment(rules);
  },

  /**
   * Return the count of customers matching the given rules.
   */
  async count(rules: SegmentRules): Promise<number> {
    return customerRepo.countForSegment(rules);
  },

  /**
   * Evaluate rules, return count + first N customers for preview.
   */
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

  /**
   * Refresh the audience_size cache on a segment after rules change.
   */
  async refreshAudienceSize(segmentId: string): Promise<number> {
    const segment = await segmentRepo.findById(segmentId);
    if (!segment) throw new Error(`Segment ${segmentId} not found`);

    const size = await customerRepo.countForSegment(segment.rules);
    await segmentRepo.updateAudienceSize(segmentId, size);
    return size;
  },
};
