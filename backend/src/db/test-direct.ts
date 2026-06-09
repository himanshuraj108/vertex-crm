import { Client } from 'pg';
import 'dotenv/config';

async function main() {
  const directUrl = process.env.DATABASE_URL!;
  console.log('Connecting directly to Supabase DB...');
  const client = new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('Connected! Creating evaluate_segment function...');
  
  const sql = `
CREATE OR REPLACE FUNCTION evaluate_segment(rules_json jsonb)
RETURNS SETOF customers AS $$
DECLARE
  logic text;
  cond jsonb;
  field text;
  op text;
  val jsonb;
  sql_query text;
  where_clause text := '';
  first boolean := true;
  operator_sql text;
  val_num numeric;
  val_arr text[];
BEGIN
  logic := rules_json->>'logic';
  IF logic IS NULL THEN
    logic := 'AND';
  END IF;

  FOR cond IN SELECT * FROM jsonb_array_elements(rules_json->'conditions')
  LOOP
    field := cond->>'field';
    op := cond->>'operator';
    val := cond->'value';

    IF field NOT IN ('total_spend', 'order_count', 'city', 'gender', 'days_since_last_order', 'visit_count') THEN
      RAISE EXCEPTION 'Invalid field name: %', field;
    END IF;

    CASE op
      WHEN 'gt' THEN operator_sql := '>';
      WHEN 'gte' THEN operator_sql := '>=';
      WHEN 'lt' THEN operator_sql := '<';
      WHEN 'lte' THEN operator_sql := '<=';
      WHEN 'eq' THEN operator_sql := '=';
      WHEN 'neq' THEN operator_sql := '!=';
      WHEN 'in' THEN operator_sql := 'IN';
      ELSE operator_sql := '=';
    END CASE;

    IF NOT first THEN
      where_clause := where_clause || ' ' || logic || ' ';
    ELSE
      first := false;
    END IF;

    IF field = 'days_since_last_order' THEN
      val_num := (val::text)::numeric;
      where_clause := where_clause || 'EXTRACT(DAY FROM NOW() - last_order_at) ' || operator_sql || ' ' || val_num;
    ELSE
      IF jsonb_typeof(val) = 'number' THEN
        where_clause := where_clause || field || ' ' || operator_sql || ' ' || (val::text);
      ELSIF jsonb_typeof(val) = 'array' THEN
        SELECT array_agg(x) INTO val_arr FROM jsonb_array_elements_text(val) x;
        where_clause := where_clause || field || ' = ANY(' || quote_literal(val_arr::text) || '::text[])';
      ELSE
        where_clause := where_clause || field || ' ' || operator_sql || ' ' || quote_literal(val->>0);
      END IF;
    END IF;
  END LOOP;

  IF where_clause = '' THEN
    where_clause := 'true';
  END IF;

  sql_query := 'SELECT * FROM customers WHERE ' || where_clause;
  RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  await client.query(sql);
  console.log('✅ evaluate_segment function created successfully!');
  await client.end();
}

main().catch(console.error);
