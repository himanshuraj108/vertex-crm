import { Router, Request, Response } from 'express';
import { SendRequest } from '../types';
import { simulateDelivery } from '../simulator';

const router = Router();

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Returns a string describing the first validation error found, or null if the
 * body is a valid SendRequest.
 */
function validateSendRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return 'Request body must be a JSON object';
  }

  const b = body as Record<string, unknown>;

  if (typeof b['communicationId'] !== 'string' || b['communicationId'].trim() === '') {
    return 'communicationId is required and must be a non-empty string';
  }

  if (typeof b['message'] !== 'string' || b['message'].trim() === '') {
    return 'message is required and must be a non-empty string';
  }

  const validChannels = ['whatsapp', 'sms', 'email', 'rcs'];
  if (!validChannels.includes(b['channel'] as string)) {
    return `channel must be one of: ${validChannels.join(', ')}`;
  }

  if (typeof b['callbackUrl'] !== 'string' || b['callbackUrl'].trim() === '') {
    return 'callbackUrl is required and must be a non-empty string';
  }

  // Validate callbackUrl is a proper URL
  try {
    new URL(b['callbackUrl'] as string);
  } catch {
    return 'callbackUrl must be a valid URL';
  }

  if (typeof b['recipient'] !== 'object' || b['recipient'] === null) {
    return 'recipient is required and must be an object';
  }

  const recipient = b['recipient'] as Record<string, unknown>;

  if (typeof recipient['id'] !== 'string' || recipient['id'].trim() === '') {
    return 'recipient.id is required and must be a non-empty string';
  }

  if (typeof recipient['name'] !== 'string' || recipient['name'].trim() === '') {
    return 'recipient.name is required and must be a non-empty string';
  }

  if (typeof recipient['email'] !== 'string' || recipient['email'].trim() === '') {
    return 'recipient.email is required and must be a non-empty string';
  }

  // phone may be null or a string
  if (recipient['phone'] !== null && typeof recipient['phone'] !== 'string') {
    return 'recipient.phone must be a string or null';
  }

  return null; // Valid
}

// ---------------------------------------------------------------------------
// POST /send
// ---------------------------------------------------------------------------

/**
 * Accepts a message send request from the CRM backend.
 *
 * Responds immediately with 202 Accepted, then asynchronously simulates
 * channel-specific delivery outcomes and fires callbacks to the CRM.
 */
router.post('/send', (req: Request, res: Response): void => {
  const validationError = validateSendRequest(req.body);

  if (validationError !== null) {
    res.status(400).json({
      success: false,
      error: validationError,
    });
    return;
  }

  const request = req.body as SendRequest;

  // Respond 202 immediately — delivery simulation is fire-and-forget
  res.status(202).json({
    success: true,
    communicationId: request.communicationId,
    message: 'Queued for delivery',
  });

  // Kick off the async simulation without awaiting
  simulateDelivery(request).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[SendRoute] Unhandled error in simulateDelivery ` +
        `communicationId=${request.communicationId}: ${message}`
    );
  });
});

export default router;
