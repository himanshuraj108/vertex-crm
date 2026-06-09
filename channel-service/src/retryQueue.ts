import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { DeliveryCallback, RetryJob } from './types';

// Exponential backoff delays in milliseconds per attempt index (0-based)
// attempt 0 → 1s, attempt 1 → 4s, attempt 2 → 16s
const RETRY_DELAYS_MS = [1_000, 4_000, 16_000];
const MAX_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 1_000;

class RetryQueue {
  private jobs: RetryJob[] = [];
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  /**
   * Add a failed callback to the retry queue.
   * The job will be retried up to MAX_ATTEMPTS times with exponential backoff.
   */
  add(callback: DeliveryCallback, callbackUrl: string): void {
    const job: RetryJob = {
      id: uuidv4(),
      callback,
      callbackUrl,
      attempts: 0,
      nextRetryAt: Date.now() + RETRY_DELAYS_MS[0],
    };

    this.jobs.push(job);
    console.warn(
      `[RetryQueue] Queued callback for communicationId=${callback.communicationId} ` +
        `status=${callback.status} job=${job.id} nextRetryAt=${new Date(job.nextRetryAt).toISOString()}`
    );
  }

  /**
   * Start the background polling interval that processes due jobs.
   */
  start(): void {
    if (this.intervalHandle !== null) {
      return; // already running
    }

    this.intervalHandle = setInterval(() => {
      void this.processDueJobs();
    }, POLL_INTERVAL_MS);

    console.log('[RetryQueue] Started — polling every 1s');
  }

  /**
   * Stop the background polling interval (used during graceful shutdown).
   */
  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[RetryQueue] Stopped');
    }
  }

  /**
   * Process all jobs whose nextRetryAt timestamp has passed.
   */
  private async processDueJobs(): Promise<void> {
    const now = Date.now();
    const dueJobs = this.jobs.filter((job) => job.nextRetryAt <= now);

    for (const job of dueJobs) {
      await this.executeJob(job);
    }
  }

  /**
   * Attempt to deliver a single job's callback. On success, remove from queue.
   * On failure, reschedule or discard after MAX_ATTEMPTS.
   */
  private async executeJob(job: RetryJob): Promise<void> {
    // Remove from queue first to avoid double-processing during async await
    this.jobs = this.jobs.filter((j) => j.id !== job.id);

    job.attempts += 1;

    try {
      await axios.post(job.callbackUrl, job.callback, { timeout: 5_000 });
      console.log(
        `[RetryQueue] Callback delivered on attempt ${job.attempts} ` +
          `job=${job.id} communicationId=${job.callback.communicationId}`
      );
      // Success — job is already removed, nothing more to do.
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      if (job.attempts >= MAX_ATTEMPTS) {
        // Exhausted all retries — discard
        console.error(
          `[RetryQueue] Discarding job=${job.id} communicationId=${job.callback.communicationId} ` +
            `after ${job.attempts} failed attempts. Last error: ${message}`
        );
      } else {
        // Schedule next retry with exponential backoff
        const delay = RETRY_DELAYS_MS[job.attempts] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        job.nextRetryAt = Date.now() + delay;
        this.jobs.push(job);
        console.warn(
          `[RetryQueue] Retry ${job.attempts}/${MAX_ATTEMPTS} failed for job=${job.id} ` +
            `communicationId=${job.callback.communicationId}. ` +
            `Next retry at ${new Date(job.nextRetryAt).toISOString()}. Error: ${message}`
        );
      }
    }
  }

  /** Returns the current number of pending jobs (useful for health checks / metrics). */
  get pendingCount(): number {
    return this.jobs.length;
  }
}

// Singleton instance shared across the application
export const retryQueue = new RetryQueue();
