-- Up Migration
-- Add GIN index on meta JSONB column to support efficient searches within audit metadata.
-- Using jsonb_path_ops for faster @> (contains) queries.
-- Note: This index does NOT support ILIKE on meta. Use CONCURRENTLY on high-traffic tables.
CREATE INDEX IF NOT EXISTS idx_activity_logs_meta_gin ON public.activity_logs USING GIN (meta jsonb_path_ops);

-- Down Migration
DROP INDEX IF EXISTS idx_activity_logs_meta_gin;
