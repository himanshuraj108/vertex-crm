import axios from 'axios';
import { SendRequest, DeliveryCallback } from './types';
import { retryQueue } from './retryQueue';

// ---------------------------------------------------------------------------
// Channel-specific outcome probabilities
// ---------------------------------------------------------------------------
const CHANNEL_CONFIG = {
  whatsapp: {
    deliveryRate: 0.92,
    openRate: 0.78,
    readRate: 0.85,
    clickRate: 0.32,
    orderRate: 0.14,
  },
  sms: {
    deliveryRate: 0.88,
    openRate: 0.55,
    readRate: 0.70,
    clickRate: 0.18,
    orderRate: 0.08,
  },
  email: {
    deliveryRate: 0.96,
    openRate: 0.38,
    readRate: 0.65,
    clickRate: 0.22,
    orderRate: 0.10,
  },
  rcs: {
    deliveryRate: 0.85,
    openRate: 0.62,
    readRate: 0.75,
    clickRate: 0.28,
    orderRate: 0.12,
  },
} as const;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Returns a random integer between min and max (inclusive). */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Returns true with the given probability (0–1). */
function chance(probability: number): boolean {
  return Math.random() < probability;
}

/** Async sleep for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Callback delivery
// ---------------------------------------------------------------------------

/**
 * POST a delivery status callback to the CRM. Falls back to the retry queue
 * on any network / HTTP error.
 */
async function sendCallback(
  callbackUrl: string,
  callback: DeliveryCallback
): Promise<void> {
  try {
    await axios.post(callbackUrl, callback, { timeout: 5_000 });
    console.log(
      `[Simulator] Callback sent communicationId=${callback.communicationId} status=${callback.status}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[Simulator] Callback failed communicationId=${callback.communicationId} ` +
        `status=${callback.status} — adding to retry queue. Error: ${message}`
    );
    retryQueue.add(callback, callbackUrl);
  }
}

// ---------------------------------------------------------------------------
// Main simulation function
// ---------------------------------------------------------------------------

/**
 * Simulates the full delivery lifecycle of a message through a given channel.
 * Each stage is probabilistic and time-delayed to replicate real-world behaviour.
 *
 * Stages (in order):
 *   sent → delivered | failed → opened → read → clicked
 *
 * The function is designed to be called fire-and-forget (no await at call site).
 */
export async function simulateDelivery(request: SendRequest): Promise<void> {
  const config = CHANNEL_CONFIG[request.channel];
  const { communicationId, callbackUrl } = request;

  console.log(
    `[Simulator] Starting simulation communicationId=${communicationId} channel=${request.channel}`
  );

  // -------------------------------------------------------------------------
  // Stage 1 — Sent (always succeeds; short network-latency delay)
  // -------------------------------------------------------------------------
  await sleep(randomBetween(100, 500));
  await sendCallback(callbackUrl, {
    communicationId,
    status: 'sent',
    timestamp: new Date().toISOString(),
  });

  // -------------------------------------------------------------------------
  // Stage 2 — Delivered OR Failed
  // -------------------------------------------------------------------------
  await sleep(randomBetween(300, 2_000));

  const delivered = chance(config.deliveryRate);

  if (!delivered) {
    await sendCallback(callbackUrl, {
      communicationId,
      status: 'failed',
      timestamp: new Date().toISOString(),
      metadata: { reason: 'Delivery failed — channel rejected the message' },
    });
    console.log(
      `[Simulator] Message failed communicationId=${communicationId}`
    );
    return; // No further stages for failed messages
  }

  await sendCallback(callbackUrl, {
    communicationId,
    status: 'delivered',
    timestamp: new Date().toISOString(),
  });

  // -------------------------------------------------------------------------
  // Stage 3 — Opened (probabilistic; user-latency delay)
  // -------------------------------------------------------------------------
  if (!chance(config.openRate)) {
    console.log(
      `[Simulator] Message delivered but not opened communicationId=${communicationId}`
    );
    return;
  }

  await sleep(randomBetween(1_000, 8_000));
  await sendCallback(callbackUrl, {
    communicationId,
    status: 'opened',
    timestamp: new Date().toISOString(),
  });

  // -------------------------------------------------------------------------
  // Stage 4 — Read (probabilistic)
  // -------------------------------------------------------------------------
  if (!chance(config.readRate)) {
    console.log(
      `[Simulator] Message opened but not read communicationId=${communicationId}`
    );
    return;
  }

  await sleep(randomBetween(500, 3_000));
  await sendCallback(callbackUrl, {
    communicationId,
    status: 'read',
    timestamp: new Date().toISOString(),
  });

  // -------------------------------------------------------------------------
  // Stage 5 — Clicked (probabilistic; includes optional order attribution)
  // -------------------------------------------------------------------------
  if (!chance(config.clickRate)) {
    console.log(
      `[Simulator] Message read but not clicked communicationId=${communicationId}`
    );
    return;
  }

  await sleep(randomBetween(500, 2_000));
  const orderAttributed = chance(config.orderRate);
  await sendCallback(callbackUrl, {
    communicationId,
    status: 'clicked',
    timestamp: new Date().toISOString(),
    metadata: {
      order_attributed: orderAttributed,
    },
  });

  console.log(
    `[Simulator] Simulation complete communicationId=${communicationId} ` +
      `order_attributed=${orderAttributed}`
  );
}
