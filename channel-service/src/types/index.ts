export interface SendRequest {
  communicationId: string;
  recipient: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  message: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  callbackUrl: string;
}

export interface DeliveryCallback {
  communicationId: string;
  status: 'sent' | 'delivered' | 'failed' | 'opened' | 'read' | 'clicked';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface RetryJob {
  id: string;
  callback: DeliveryCallback;
  callbackUrl: string;
  attempts: number;
  nextRetryAt: number;
}
