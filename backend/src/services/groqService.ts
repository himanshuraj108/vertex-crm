import Groq from 'groq-sdk';
import { CompletionCreateParams } from 'groq-sdk/resources/chat/completions';
import { SegmentRules, CampaignStats } from '../types';
import logger from '../utils/logger';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = 'llama-3.3-70b-versatile';

const SEGMENT_RULES_SCHEMA = {
  type: 'object',
  description: 'SegmentRules object specifying filtering conditions and logic',
  required: ['logic', 'conditions'],
  properties: {
    logic: { type: 'string', enum: ['AND', 'OR'], description: 'Logic to combine conditions' },
    conditions: {
      type: 'array',
      description: 'List of filters to apply to the customer base',
      items: {
        type: 'object',
        required: ['field', 'operator', 'value'],
        properties: {
          field: {
            type: 'string',
            enum: ['total_spend', 'order_count', 'city', 'gender', 'days_since_last_order', 'visit_count'],
            description: 'The customer field to filter on'
          },
          operator: {
            type: 'string',
            enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'neq', 'in'],
            description: 'Comparison operator'
          },
          value: {
            description: 'Comparison value (e.g., number for total_spend, string for city, array of strings for IN operator)'
          }
        }
      }
    }
  }
};

type ChatCompletionCreateParams = Parameters<typeof groq.chat.completions.create>[0];

// Helper to perform chat completion with fallback to llama-3.1-8b-instant on 429 rate limit
async function createChatCompletion(
  params: Omit<ChatCompletionCreateParams, 'model'> & { model?: string }
): Promise<any> {
  const primaryModel = params.model || MODEL;
  try {
    return await groq.chat.completions.create({
      ...params,
      model: primaryModel,
    } as ChatCompletionCreateParams);
  } catch (err: any) {
    if (err.status === 429 && primaryModel === 'llama-3.3-70b-versatile') {
      logger.warn('Groq 429 Rate Limit. Falling back to llama-3.1-8b-instant...');
      return await groq.chat.completions.create({
        ...params,
        model: 'llama-3.1-8b-instant',
      } as ChatCompletionCreateParams);
    }
    throw err;
  }
}

// ─── AI Tool definitions ──────────────────────────────────────────────────────

const AI_TOOLS: CompletionCreateParams.Tool[] = [
  {
    type: 'function',
    function: {
      name: 'query_customers',
      description: 'Query customers with filters to find matching shoppers',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Filter by city name' },
          gender: { type: 'string', enum: ['male', 'female', 'other', ''] },
          min_spend: { type: 'number', description: 'Minimum total spend in INR' },
          max_spend: { type: 'number', description: 'Maximum total spend in INR' },
          days_since_last_order_gt: { type: 'number', description: 'Customers inactive for more than N days' },
          order_count_gte: { type: 'number', description: 'Customers with at least N orders' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_segment',
      description: 'Create a named customer segment with rules',
      parameters: {
        type: 'object',
        required: ['name', 'rules'],
        properties: {
          name: { type: 'string', description: 'Segment name' },
          description: { type: 'string', description: 'What this segment represents' },
          rules: SEGMENT_RULES_SCHEMA,
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'preview_segment',
      description: 'Preview how many customers match a set of segment rules without saving',
      parameters: {
        type: 'object',
        required: ['rules'],
        properties: {
          rules: SEGMENT_RULES_SCHEMA,
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_campaign',
      description: 'Create a campaign draft targeting a segment',
      parameters: {
        type: 'object',
        required: ['name', 'segment_id', 'channel', 'message_template'],
        properties: {
          name: { type: 'string' },
          segment_id: { type: 'string', description: 'UUID of the target segment' },
          channel: { type: 'string', enum: ['whatsapp', 'sms', 'email', 'rcs'] },
          message_template: {
            type: 'string',
            description: 'Message with {{name}}, {{city}}, {{last_order}}, {{total_spend}} variables',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'launch_campaign',
      description: 'Launch a campaign draft to start sending messages to the segment',
      parameters: {
        type: 'object',
        required: ['campaign_id'],
        properties: {
          campaign_id: { type: 'string', description: 'UUID of the campaign to launch' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaign_stats',
      description: 'Get real-time performance statistics for a campaign',
      parameters: {
        type: 'object',
        required: ['campaign_id'],
        properties: {
          campaign_id: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_analytics_summary',
      description: 'Get overall CRM analytics including total customers, campaigns, and revenue',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an AI assistant for Vertex CRM, helping BrewCo (a premium Indian coffee chain) reach their customers effectively.

You have access to tools to query customer data, create segments, manage campaigns, and analyze performance.

**Your persona**: You are concise, data-driven, and action-oriented. You understand coffee retail, Indian markets, and customer lifecycle.

**Database Schema**:
- customers: id, name, email, phone, city (Mumbai/Delhi/Bangalore/Chennai/Pune/Hyderabad), gender, total_spend (INR), order_count, visit_count, last_order_at, tags
- segments: id, name, description, rules (JSON), audience_size, ai_generated
- campaigns: id, name, segment_id, channel (whatsapp/sms/email/rcs), message_template, status
- communications: id, campaign_id, customer_id, message, status (queued/sent/delivered/failed/opened/read/clicked)
- campaign_stats: campaign_id, total, sent, delivered, failed, opened, read_count, clicked, orders_attributed

**Segment Rules Format**:
\`\`\`json
{
  "logic": "AND",
  "conditions": [
    { "field": "total_spend", "operator": "gt", "value": 5000 },
    { "field": "city", "operator": "eq", "value": "Mumbai" }
  ]
}
\`\`\`

Available fields: total_spend, order_count, city, gender, days_since_last_order, visit_count
Available operators: gt, lt, gte, lte, eq, neq, in

**Message template variables**: {{name}}, {{city}}, {{last_order}}, {{total_spend}}, {{order_count}}

**Guidelines**:
1. Always show your brief reasoning before taking tool actions
2. Before launching campaigns, summarize the segment size and message for user confirmation
3. Suggest compelling, brand-appropriate messages for a premium coffee chain
4. When analyzing, provide specific, actionable recommendations
5. Keep messages under 160 chars for SMS, more flexibility for WhatsApp/email
6. When calling tools (like query_customers), only specify parameters that are relevant to the user's request. Do not pass default values (like 0, null, or empty strings) for unused filters, as this will filter the data incorrectly.

Current date: ${new Date().toISOString().split('T')[0]}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: CompletionCreateParams.Message.ToolCall[];
  name?: string;
}

export interface ToolCallResult {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result: unknown;
  summary?: string;
}

// ─── Main Agent Chat ──────────────────────────────────────────────────────────

/**
 * Multi-turn agent chat with function calling.
 */
export async function chatWithAgent(
  messages: ChatMessage[],
  toolExecutor: (toolName: string, args: Record<string, unknown>) => Promise<unknown>
): Promise<{ message: string; toolCalls: ToolCallResult[] }> {
  const conversationMessages: CompletionCreateParams.Message[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...messages.map((m): CompletionCreateParams.Message => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: m.tool_call_id ?? '',
          content: m.content ?? '',
        };
      }
      if (m.role === 'assistant' && m.tool_calls) {
        return {
          role: 'assistant',
          content: m.content ?? '',
          tool_calls: m.tool_calls,
        };
      }
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content ?? '',
      };
    }),
  ];

  const allToolCalls: ToolCallResult[] = [];
  let maxIterations = 10;

  while (maxIterations-- > 0) {
    const response = await createChatCompletion({
      model: MODEL,
      messages: conversationMessages,
      tools: AI_TOOLS,
      tool_choice: 'auto' as CompletionCreateParams.ToolChoice,
      max_tokens: 2048,
    });

    const choice = response.choices[0];
    const assistantMsg = choice.message;

    const assistantMsgForHistory: CompletionCreateParams.Message = {
      role: 'assistant',
      content: assistantMsg.content ?? '',
      tool_calls: assistantMsg.tool_calls as CompletionCreateParams.Message.ToolCall[] | undefined,
    };
    conversationMessages.push(assistantMsgForHistory);

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      return {
        message: assistantMsg.content ?? '',
        toolCalls: allToolCalls,
      };
    }

    const toolResultMessages: CompletionCreateParams.Message[] = [];

    for (const toolCall of assistantMsg.tool_calls) {
      const toolName = toolCall.function?.name ?? '';
      let args: Record<string, unknown> = {};

      try {
        args = JSON.parse(toolCall.function?.arguments ?? '{}') as Record<string, unknown>;
      } catch {
        args = {};
      }

      logger.debug(`AI agent calling tool: ${toolName}`, { args });

      let result: unknown;
      try {
        result = await toolExecutor(toolName, args);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : 'Tool execution failed' };
      }

      allToolCalls.push({
        toolName,
        toolCallId: toolCall.id ?? '',
        args,
        result,
        summary: `Called ${toolName}`,
      });

      toolResultMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id ?? '',
        content: JSON.stringify(result),
      });
    }

    conversationMessages.push(...toolResultMessages);
  }

  return {
    message: 'I apologize, I reached the maximum number of reasoning steps. Please try a simpler request.',
    toolCalls: allToolCalls,
  };
}

// ─── NL to Segment Rules ──────────────────────────────────────────────────────

export async function parseSegmentFromNL(description: string): Promise<{ rules: SegmentRules; name: string }> {
  const prompt = `Convert the following customer segment description into a valid SegmentRules JSON object.

Description: "${description}"

Return JSON with this exact structure:
{
  "name": "Short segment name",
  "rules": {
    "logic": "AND",
    "conditions": [
      { "field": "total_spend", "operator": "gt", "value": 5000 }
    ]
  }
}

Available fields: total_spend, order_count, city, gender, days_since_last_order, visit_count
Available operators: gt, lt, gte, lte, eq, neq, in
Available cities: Mumbai, Delhi, Bangalore, Chennai, Pune, Hyderabad

Return ONLY valid JSON, no explanation, no markdown fences.`;

  const response = await createChatCompletion({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
    temperature: 0.1,
  });

  const content = (response.choices[0].message.content ?? '{}')
    .replace(/```json?\n?/g, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(content) as { rules: SegmentRules; name: string };
  } catch {
    logger.warn('Failed to parse AI segment response:', content);
    throw new Error('AI returned invalid JSON for segment rules');
  }
}

// ─── Campaign Message Draft ───────────────────────────────────────────────────

export async function draftCampaignMessage(
  segmentDescription: string,
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs'
): Promise<string> {
  const constraints: Record<string, string> = {
    sms: 'Keep under 160 characters. No emojis.',
    whatsapp: 'Conversational tone. Use 1-2 relevant emojis. 200-300 characters.',
    email: 'Engaging subject line implied. 2-3 sentences. Warm and personal.',
    rcs: 'Rich message format. Include a clear CTA. 150-250 characters with emoji.',
  };

  const prompt = `You are writing a marketing message for BrewCo, a premium Indian coffee chain.

Target audience: ${segmentDescription}
Channel: ${channel}
Constraints: ${constraints[channel]}

Use template variables where appropriate: {{name}}, {{city}}, {{last_order}}, {{total_spend}}

Write ONLY the message template text. No explanations, no labels, just the message.`;

  const response = await createChatCompletion({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.7,
  });

  return (response.choices[0].message.content ?? '').trim();
}

// ─── Campaign Analysis ────────────────────────────────────────────────────────

export async function analyzeCampaign(
  stats: CampaignStats,
  segmentName: string,
  channel: string
): Promise<string> {
  const deliveryRate = stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : '0';
  const openRate = stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(1) : '0';
  const clickRate = stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(1) : '0';

  const prompt = `Analyze this BrewCo CRM campaign performance and provide exactly 3 specific, actionable recommendations.

Campaign Statistics:
- Segment: ${segmentName}
- Channel: ${channel}
- Total audience: ${stats.total}
- Sent: ${stats.sent} | Failed: ${stats.failed}
- Delivered: ${stats.delivered} (${deliveryRate}% delivery rate)
- Opened: ${stats.opened} (${openRate}% open rate)
- Read: ${stats.read_count}
- Clicked: ${stats.clicked} (${clickRate}% click rate)
- Orders attributed: ${stats.orders_attributed}

Provide:
1. A brief 2-sentence performance summary
2. Exactly 3 numbered actionable recommendations for improvement

Be specific to the coffee chain context. Keep total response under 200 words.`;

  const response = await createChatCompletion({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.4,
  });

  return (response.choices[0].message.content ?? '').trim();
}

// ─── Segment Suggestions ──────────────────────────────────────────────────────

export async function suggestSegments(customerStats: {
  totalCustomers: number;
  avgSpend: number;
  avgOrderCount: number;
  cities: string[];
}): Promise<{ insight: string; segments: Array<{ name: string; description: string; rules: SegmentRules }> }> {
  const prompt = `You are a CRM strategy expert for BrewCo, a premium Indian coffee chain.

Current customer base:
- Total customers: ${customerStats.totalCustomers}
- Average spend: ₹${Math.round(customerStats.avgSpend)}
- Average order count: ${customerStats.avgOrderCount.toFixed(1)}
- Cities: ${customerStats.cities.join(', ')}

Return a JSON object with:
{
  "insight": "One-sentence AI insight about the customer base",
  "segments": [exactly 3 segment objects with name, description, and rules]
}

Each segment rules object:
{
  "logic": "AND",
  "conditions": [
    { "field": "total_spend", "operator": "gt", "value": 5000 }
  ]
}

Available fields: total_spend, order_count, city, gender, days_since_last_order, visit_count
Available operators: gt, lt, gte, lte, eq, neq, in

Return ONLY the JSON. No markdown. No explanation.`;

  const response = await createChatCompletion({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 900,
    temperature: 0.5,
  });

  const content = (response.choices[0].message.content ?? '{}')
    .replace(/```json?\n?/g, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(content) as {
      insight: string;
      segments: Array<{ name: string; description: string; rules: SegmentRules }>;
    };
  } catch {
    logger.warn('Failed to parse AI segment suggestions:', content);
    return { insight: 'Focus on re-engaging customers who haven\'t ordered recently for maximum impact.', segments: [] };
  }
}

// ─── Generate Chat Title ──────────────────────────────────────────────────────

export async function generateChatTitle(firstMessage: string): Promise<string> {
  const prompt = `Generate a very short, clean, emoji-free title (3 to 5 words maximum) that summarizes this user request for a CRM AI assistant:

Request: "${firstMessage}"

Return ONLY the plain title text, no quotes, no formatting.`;

  try {
    const response = await createChatCompletion({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
      temperature: 0.5,
    });
    return (response.choices[0].message.content ?? 'New Conversation').replace(/^"|"$/g, '').trim();
  } catch {
    return firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
  }
}
