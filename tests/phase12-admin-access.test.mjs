import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL("../supabase/migration_phase12_admin_access.sql", import.meta.url),
  "utf8"
);
const guard = fs.readFileSync(
  new URL("../components/AuthGuard.tsx", import.meta.url),
  "utf8"
);
const login = fs.readFileSync(
  new URL("../app/login/page.tsx", import.meta.url),
  "utf8"
);

test("stores the owner in a private administrator allowlist", () => {
  assert.match(migration, /create table if not exists public\.authorized_admins/i);
  assert.match(migration, /revoke all on table public\.authorized_admins from public, anon, authenticated/i);
  assert.match(migration, /1c6a6f15-ce47-4884-a62a-39b57b99dd84/i);
});

test("requires administrator authorization in database and UI", () => {
  assert.match(migration, /create or replace function public\.is_admin\(\)/i);
  assert.match(migration, /as restrictive for all to authenticated/i);
  assert.match(migration, /if not public\.is_admin\(\) then/gi);
  assert.match(guard, /rpc\("is_admin"\)/i);
  assert.match(login, /rpc\("is_admin"\)/i);
});

test("keeps public storefront functions available", () => {
  assert.doesNotMatch(migration, /revoke.+create_store_order/is);
  assert.doesNotMatch(migration, /revoke.+list_store_products/is);
});
