import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const store = fs.readFileSync(
  new URL("../app/tienda/page.tsx", import.meta.url),
  "utf8"
);

test("shows the inventory shortcut only after admin authorization", () => {
  assert.match(store, /rpc\("is_admin"\)/i);
  assert.match(store, /isAdmin\s*&&/i);
  assert.match(store, /href="\/inventario"/i);
});

test("does not expose the shortcut based only on an authenticated session", () => {
  assert.doesNotMatch(store, /if\s*\(user\)\s*setIsAdmin\(true\)/i);
});
