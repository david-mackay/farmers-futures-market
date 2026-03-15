-- Reset all data; keep table structure and indexes.
-- Run in Supabase SQL editor (or psql against DATABASE_URL).
-- Single TRUNCATE so Postgres respects foreign keys (vouchers → orders → users).

TRUNCATE vouchers, orders, users, crops RESTART IDENTITY;
