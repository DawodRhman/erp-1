-- Up Migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- Down Migration
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
