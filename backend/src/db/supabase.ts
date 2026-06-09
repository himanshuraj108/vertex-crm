import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

// Main Supabase client — connects over HTTPS (port 443), no pg port needed
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' },
});

/**
 * Run raw SQL via Supabase RPC.
 * Requires an exec_sql function to be created in the database.
 * Falls back gracefully if not available.
 */
export async function rpc<T = unknown>(fn: string, params?: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(fn, params ?? {});
  if (error) throw new Error(`RPC ${fn} failed: ${error.message}`);
  return data as T[];
}

/**
 * Generic select helper with type safety
 */
export async function selectFrom<T = Record<string, unknown>>(
  table: string,
  options?: {
    columns?: string;
    filter?: (q: ReturnType<SupabaseClient['from']>['select']) => ReturnType<SupabaseClient['from']>['select'];
    limit?: number;
    offset?: number;
    order?: { column: string; ascending?: boolean };
  }
): Promise<T[]> {
  let q = supabase.from(table).select(options?.columns ?? '*');
  if (options?.order) {
    q = q.order(options.order.column, { ascending: options.order.ascending ?? true }) as typeof q;
  }
  if (options?.limit) q = q.limit(options.limit) as typeof q;
  if (options?.offset) q = q.range(options.offset, (options.offset + (options.limit ?? 50)) - 1) as typeof q;
  const { data, error } = await q;
  if (error) throw new Error(`Select from ${table} failed: ${error.message}`);
  return (data ?? []) as T[];
}

export async function testConnection(): Promise<void> {
  try {
    const { error } = await supabase.from('customers').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = table doesn't exist yet — that's ok, means connection works
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        logger.info('✅ Supabase connected (schema not yet applied)');
        return;
      }
      throw new Error(error.message);
    }
    logger.info('✅ Supabase connected via HTTPS');
  } catch (err) {
    logger.error('❌ Supabase connection failed', err);
    throw err;
  }
}
