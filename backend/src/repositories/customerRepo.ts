import { supabase } from '../db/supabase';
import { Customer, SegmentRules } from '../types';

// ─── SQL WHERE clause builder for segment rules ───────────────────────────────

function buildSegmentFilter(
  rules: SegmentRules
): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const cond of rules.conditions) {
    let col: string;
    if (cond.field === 'days_since_last_order') {
      col = `EXTRACT(DAY FROM NOW() - last_order_at)`;
    } else {
      col = cond.field;
    }

    const opMap: Record<string, string> = {
      gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=', neq: '!=',
    };

    if (cond.operator === 'in') {
      const vals = Array.isArray(cond.value) ? cond.value : [cond.value];
      const placeholders = vals.map(() => `$${idx++}`).join(', ');
      parts.push(`${col} IN (${placeholders})`);
      params.push(...vals);
    } else {
      parts.push(`${col} ${opMap[cond.operator] ?? '='} $${idx++}`);
      params.push(cond.value);
    }
  }

  const joiner = rules.logic === 'OR' ? ' OR ' : ' AND ';
  return { sql: parts.join(joiner), params };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const customerRepo = {
  async findAll(
    page = 1,
    limit = 15,
    search?: string,
    city?: string,
    gender?: string
  ): Promise<{ data: Customer[]; total: number }> {
    let q = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (city) q = q.eq('city', city);
    if (gender) q = q.eq('gender', gender);

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return { data: (data ?? []) as Customer[], total: count ?? 0 };
  },

  async findById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Customer;
  },

  async findOrders(customerId: string, page = 1, limit = 10) {
    const { data, error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('ordered_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error(error.message);
    return { data: data ?? [], total: count ?? 0 };
  },

  async findCampaigns(customerId: string) {
    const { data, error } = await supabase
      .from('communications')
      .select(`
        campaign_id,
        status,
        sent_at,
        campaigns (id, name, channel, status)
      `)
      .eq('customer_id', customerId)
      .order('sent_at', { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(customerData: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Customer;
  },

  async bulkCreate(customers: Omit<Customer, 'id' | 'created_at'>[]): Promise<number> {
    const { data, error } = await supabase
      .from('customers')
      .upsert(customers, { onConflict: 'email', ignoreDuplicates: true })
      .select('id');
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  },

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  // For segment evaluation — uses Supabase's built-in filters for simple conditions
  async findForSegment(rules: SegmentRules): Promise<Customer[]> {
    // For complex conditions (days_since_last_order), fall back to rpc
    const hasComplexField = rules.conditions.some(
      (c) => c.field === 'days_since_last_order'
    );

    if (hasComplexField || rules.logic === 'OR') {
      // Use RPC function for complex queries
      const { data, error } = await supabase.rpc('evaluate_segment', {
        rules_json: rules,
      });
      if (error) {
        // Fallback: approximate with simpler query
        return this.findForSegmentFallback(rules);
      }
      return (data ?? []) as Customer[];
    }

    // Build simple Supabase filter chain for AND conditions without complex fields
    let q = supabase.from('customers').select('*');

    for (const cond of rules.conditions) {
      const val = cond.value;
      switch (cond.operator) {
        case 'gt':  q = q.gt(cond.field, val as number); break;
        case 'gte': q = q.gte(cond.field, val as number); break;
        case 'lt':  q = q.lt(cond.field, val as number); break;
        case 'lte': q = q.lte(cond.field, val as number); break;
        case 'eq':  q = q.eq(cond.field, val as string); break;
        case 'neq': q = q.neq(cond.field, val as string); break;
        case 'in':  q = q.in(cond.field, Array.isArray(val) ? val as string[] : [val as string]); break;
      }
    }

    const { data, error } = await q.limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []) as Customer[];
  },

  async findForSegmentFallback(rules: SegmentRules): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*').limit(5000);
    if (error) throw new Error(error.message);
    const allCustomers = (data ?? []) as Customer[];

    const evaluateConditionInMemory = (c: Customer, cond: any): boolean => {
      let val: any;
      if (cond.field === 'days_since_last_order') {
        if (!c.last_order_at) return false;
        const lastOrderTime = new Date(c.last_order_at).getTime();
        val = (new Date().getTime() - lastOrderTime) / (24 * 60 * 60 * 1000);
      } else {
        val = (c as any)[cond.field];
      }

      const condVal = cond.value;
      switch (cond.operator) {
        case 'gt': return Number(val) > Number(condVal);
        case 'gte': return Number(val) >= Number(condVal);
        case 'lt': return Number(val) < Number(condVal);
        case 'lte': return Number(val) <= Number(condVal);
        case 'eq': 
          if (typeof val === 'string' && typeof condVal === 'string') {
            return val.toLowerCase() === condVal.toLowerCase();
          }
          return val == condVal;
        case 'neq':
          if (typeof val === 'string' && typeof condVal === 'string') {
            return val.toLowerCase() !== condVal.toLowerCase();
          }
          return val != condVal;
        case 'in':
          const arr = Array.isArray(condVal) ? condVal : [condVal];
          return arr.map(v => String(v).toLowerCase()).includes(String(val).toLowerCase());
        default:
          return false;
      }
    };

    return allCustomers.filter(c => {
      if (!rules.conditions || rules.conditions.length === 0) return true;
      
      const results = rules.conditions.map(cond => evaluateConditionInMemory(c, cond));
      if (rules.logic === 'OR') {
        return results.some(r => r === true);
      } else {
        return results.every(r => r === true);
      }
    });
  },

  async countForSegment(rules: SegmentRules): Promise<number> {
    const customers = await this.findForSegment(rules);
    return customers.length;
  },
};
