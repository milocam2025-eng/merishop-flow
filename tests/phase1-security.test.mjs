import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const securitySql = await readFile(
  new URL("../supabase/migration_phase1_security.sql", import.meta.url),
  "utf8"
);
const lockdownSql = await readFile(
  new URL("../supabase/migration_phase1_lockdown.sql", import.meta.url),
  "utf8"
);

test("checkout is implemented as a security-definer transaction", () => {
  assert.match(securitySql, /create or replace function public\.create_store_order/i);
  assert.match(securitySql, /security definer/i);
  assert.match(securitySql, /for update/i);
  assert.match(
    securitySql,
    /v_new_quantity\s*:=\s*v_inventory\.quantity\s*-\s*v_requested_quantity/i
  );
});

test("order cancellation restores reserved inventory", () => {
  assert.match(
    securitySql,
    /create or replace function public\.cancel_order_and_restore_inventory/i
  );
  assert.match(
    securitySql,
    /v_new_quantity\s*:=\s*coalesce\(v_inventory\.quantity,\s*0\)\s*\+\s*v_restore_quantity/i
  );
});

test("public catalog only exposes explicit safe functions", () => {
  assert.match(securitySql, /create or replace function public\.list_store_products/i);
  assert.match(securitySql, /create or replace function public\.get_store_product/i);
  assert.match(securitySql, /create or replace function public\.list_store_product_images/i);
});

test("legacy anonymous table access remains locked down", () => {
  assert.match(lockdownSql, /revoke insert on table public\.orders from public, anon/i);
  assert.match(lockdownSql, /drop policy if exists orders_public_insert/i);
  assert.match(lockdownSql, /revoke select on table public\.inventory from public, anon/i);
  assert.match(
    lockdownSql,
    /revoke select on table public\.inventory_images from public, anon/i
  );
});
