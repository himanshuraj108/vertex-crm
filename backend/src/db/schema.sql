-- Vertex CRM — PostgreSQL Schema
-- Run this once against your vertex_crm database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Customers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  phone         TEXT,
  city          TEXT,
  gender        TEXT        CHECK (gender IN ('male', 'female', 'other')),
  total_spend   NUMERIC(10,2) DEFAULT 0,
  order_count   INT         DEFAULT 0,
  visit_count   INT         DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  tags          TEXT[]      DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  items       JSONB       NOT NULL DEFAULT '[]',
  channel     TEXT        CHECK (channel IN ('online', 'offline', 'app')) DEFAULT 'online',
  status      TEXT        DEFAULT 'completed',
  ordered_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Segments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS segments (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  description   TEXT,
  rules         JSONB       NOT NULL,
  audience_size INT         DEFAULT 0,
  ai_generated  BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Campaigns ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT        NOT NULL,
  segment_id       UUID        REFERENCES segments(id) ON DELETE SET NULL,
  channel          TEXT        NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'rcs')),
  message_template TEXT        NOT NULL,
  status           TEXT        DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'failed')),
  launched_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Communications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communications (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id  UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  message      TEXT        NOT NULL,
  status       TEXT        DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed','opened','read','clicked')),
  sent_at      TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  clicked_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Campaign Stats ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_stats (
  campaign_id      UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  total            INT  DEFAULT 0,
  sent             INT  DEFAULT 0,
  delivered        INT  DEFAULT 0,
  failed           INT  DEFAULT 0,
  opened           INT  DEFAULT 0,
  read_count       INT  DEFAULT 0,
  clicked          INT  DEFAULT 0,
  orders_attributed INT DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_customer_id      ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at       ON orders(ordered_at);
CREATE INDEX IF NOT EXISTS idx_communications_campaign ON communications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_communications_status   ON communications(status);
CREATE INDEX IF NOT EXISTS idx_customers_total_spend   ON customers(total_spend);
CREATE INDEX IF NOT EXISTS idx_customers_city          ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_last_order    ON customers(last_order_at);

-- ─── Evaluate Segment Function ───────────────────────────────────────────────
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
