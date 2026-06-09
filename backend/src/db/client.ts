import { Pool, QueryResult, QueryResultRow } from 'pg';
import logger from '../utils/logger';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug(`Executed query in ${duration}ms | rows: ${result.rowCount}`);
    return result;
  } catch (err) {
    logger.error('Database query error', { text, params, err });
    throw err;
  }
}

export async function testConnection(): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    logger.info(
      `✅ PostgreSQL connected — server time: ${result.rows[0].now}`
    );
  } catch (err) {
    logger.error('❌ Failed to connect to PostgreSQL', err);
    throw err;
  }
}
