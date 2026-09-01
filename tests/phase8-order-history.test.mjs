import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql = fs.readFileSync(
  new URL("../supabase/migration_phase8_order_history.sql", import.meta.url),
  "utf8"
);

test("creates an order history table and status trigger", () => {
  assert.match(sql, /create table if not exists public\.order_status_history/i);
  assert.match(sql, /after insert or update of status on public\.orders/i);
  assert.match(sql, /new\.status is distinct from old\.status/i);
});

test("protects history with RLS and authenticated read access", () => {
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /to authenticated/i);
  assert.match(sql, /revoke all on table public\.order_status_history from public, anon/i);
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete).*\s+to\s+anon/i);
});

test("supports public store orders without exposing their history", () => {
  assert.match(sql, /user_id uuid,/i);
  assert.match(sql, /o\.source = 'tienda'/i);
  assert.match(sql, /when auth\.uid\(\) is null then 'public_store'/i);
});
