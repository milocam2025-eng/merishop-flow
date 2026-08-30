import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL("../supabase/migration_phase6_inventory.sql", import.meta.url),
  "utf8"
);
const audit = fs.readFileSync(
  new URL("../supabase/audit_phase6_inventory.sql", import.meta.url),
  "utf8"
);

test("phase 6 records every inventory quantity change", () => {
  assert.match(migration, /create table if not exists public\.inventory_movements/i);
  assert.match(migration, /after insert or update of quantity on public\.inventory/i);
  assert.match(migration, /quantity_delta\s*=\s*new_quantity\s*-\s*previous_quantity/i);
});

test("inventory history is private to its owner", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /using \(auth\.uid\(\) = user_id\)/i);
  assert.match(migration, /revoke all on table public\.inventory_movements from public, anon/i);
});

test("phase 6 protects SKU and nonnegative values", () => {
  assert.match(migration, /inventory_owner_sku_unique_idx/i);
  assert.match(migration, /inventory_sku_not_blank/i);
  assert.match(migration, /inventory_quantity_nonnegative/i);
  assert.match(audit, /SKU DUPLICADO/i);
});
