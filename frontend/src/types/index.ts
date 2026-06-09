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
  last_order_at: string | null;
  tags: string[];
  created_at: string;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  customer_id: string;
  amount: number;
  items: OrderItem[];
  channel: 'online' | 'offline' | 'app';
  status: string;
  ordered_at: string;
}

export interface SegmentCondition {
  field: 'total_spend' | 'order_count' | 'city' | 'gender' | 'days_since_last_order' | 'visit_count';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq' | 'in';
  value: string | number | string[];
}

export interface SegmentRules {
  logic: 'AND' | 'OR';
  conditions: SegmentCondition[];
}

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  rules: SegmentRules;
  audience_size: number;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  segment_id: string | null;
  segment_name?: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  message_template: string;
  status: 'draft' | 'running' | 'completed' | 'failed';
  launched_at: string | null;
  created_at: string;
  stats?: CampaignStats;
}

export interface Communication {
  id: string;
  campaign_id: string;
  customer_id: string;
  customer_name?: string;
  message: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'read' | 'clicked';
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  read_at: string | null;
  clicked_at: string | null;
  updated_at: string;
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
  updated_at: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  avgDeliveryRate: number;
  totalRevenueAttributed: number;
  recentCampaigns: Campaign[];
  performanceChart?: Array<{
    day: string;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: AIToolCall[];
  timestamp?: string;
}

export interface AIToolCall {
  name: string;
  summary: string;
  result: unknown;
}

export interface SegmentPreview {
  count: number;
  percentage: number;
  sample: Pick<Customer, 'id' | 'name' | 'city' | 'total_spend'>[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: AIMessage[];
  created_at: string;
  updated_at: string;
}
