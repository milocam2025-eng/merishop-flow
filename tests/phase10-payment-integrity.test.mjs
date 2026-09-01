import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql = fs.readFileSync(
  new URL("../supabase/migration_phase10_payment_integrity.sql", import.meta.url),
  "utf8"
);

test("registers payments and updates orders in one locked transaction", () => {
  assert.match(sql, /create or replace function public\.register_order_payment/i);
  assert.match(sql, /for update;/i);
  assert.match(sql, /insert into public\.payments/i);
  assert.match(sql, /update public\.orders/i);
});

test("rejects invalid, cancelled and excessive payments", () => {
  assert.match(sql, /p_amount is null or p_amount <= 0/i);
  assert.match(sql, /v_order\.status = 'Cancelado'/i);
  assert.match(sql, /p_amount > v_total - v_paid/i);
});

test("prevents clients from bypassing the payment function", () => {
  assert.match(sql, /grant execute .* to authenticated/i);
  assert.match(sql, /revoke insert, update, delete on table public\.payments from public, anon, authenticated/i);
  assert.match(sql, /grant update \(status\) on table public\.orders to authenticated/i);
});
