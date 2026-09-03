import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL("../supabase/migration_phase11_continuity.sql", import.meta.url),
  "utf8"
);
const healthRoute = fs.readFileSync(
  new URL("../app/api/health/route.ts", import.meta.url),
  "utf8"
);
const backupScript = fs.readFileSync(
  new URL("../scripts/backup-database.sh", import.meta.url),
  "utf8"
);
const audit = fs.readFileSync(
  new URL("../supabase/audit_phase11_continuity.sql", import.meta.url),
  "utf8"
);

test("audits the cancellation function used by the application", () => {
  assert.match(audit, /cancel_order_and_restore_inventory/i);
  assert.doesNotMatch(audit, /cancel_store_order/i);
});

test("keeps a private migration registry", () => {
  assert.match(migration, /create table if not exists public\.schema_migrations/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.schema_migrations from public, anon, authenticated/i);
  assert.match(migration, /values \('11'/i);
});

test("exposes only a restricted database health function", () => {
  assert.match(migration, /create or replace function public\.health_check\(\)/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /grant execute on function public\.health_check\(\) to anon, authenticated/i);
});

test("reports database failures as degraded without error details", () => {
  assert.match(healthRoute, /\.rpc\("health_check"\)/i);
  assert.match(healthRoute, /AbortSignal\.timeout\(4_000\)/i);
  assert.match(healthRoute, /status: "degraded"/i);
  assert.match(healthRoute, /status: 503/i);
  assert.doesNotMatch(healthRoute, /error\.message/i);
});

test("creates a verifiable least-privilege backup", () => {
  assert.match(backupScript, /pg_dump/i);
  assert.match(backupScript, /--format=custom/i);
  assert.match(backupScript, /--no-owner/i);
  assert.match(backupScript, /pg_restore --list/i);
  assert.match(backupScript, /sha256sum|shasum -a 256/i);
});
