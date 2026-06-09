export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  gender: 'male' | 'female' | 'other' | null;
  total_spend: number;
  order_count: number;
  visit_count: number;
  last_order_at: Date | null;
  tags: string[];
  created_at: Date;
}

export interface Order {
  id: string;
  customer_id: string;
  amount: number;
  items: OrderItem[];
  channel: 'online' | 'offline' | 'app';
  status: string;
  ordered_at: Date;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  rules: SegmentRules;
  audience_size: number;
  ai_generated: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SegmentRules {
  logic: 'AND' | 'OR';
  conditions: SegmentCondition[];
}

export interface SegmentCondition {
  field:
    | 'total_spend'
    | 'order_count'
    | 'city'
    | 'gender'
    | 'days_since_last_order'
    | 'visit_count';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq' | 'in';
  value: string | number | string[];
}

export interface Campaign {
  id: string;
  name: string;
  segment_id: string | null;
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  message_template: string;
  status: 'draft' | 'running' | 'completed' | 'failed';
  launched_at: Date | null;
  created_at: Date;
  // Joined fields (from Supabase select with relations)
  segment_name?: string | null;
  stats?: CampaignStats | null;
}

export interface Communication {
  id: string;
  campaign_id: string;
  customer_id: string;
  message: string;
  status:
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'failed'
    | 'opened'
    | 'read'
    | 'clicked';
  sent_at: Date | null;
  delivered_at: Date | null;
  opened_at: Date | null;
  read_at: Date | null;
  clicked_at: Date | null;
  updated_at: Date;
}

export interface CampaignStats {
  campaign_id: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  read_count: number;
  clicked: number;
  orders_attributed: number;
  updated_at: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
