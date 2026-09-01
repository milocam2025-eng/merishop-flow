import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../lib/reporting.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports });
const { inDateRange, orderTotalMXN, summarizeOrders } = module.exports;

test("uses the MXN total for public store orders", () => {
  assert.equal(orderTotalMXN({ source: "tienda", total: 12, total_mxn: 675, created_at: "2026-01-01" }), 675);
  assert.equal(orderTotalMXN({ source: "admin", total: 500, created_at: "2026-01-01" }), 500);
});

test("summaries exclude cancelled orders and calculate balances", () => {
  const summary = summarizeOrders([
    { source: "tienda", total_mxn: 1000, paid: 400, status: "Pendiente", created_at: "2026-01-01" },
    { total: 800, paid: 0, status: "Cancelado", created_at: "2026-01-02" },
  ]);
  assert.equal(summary.sales, 1000);
  assert.equal(summary.paid, 400);
  assert.equal(summary.balance, 600);
  assert.equal(summary.orders, 1);
});

test("date ranges include the complete start and end dates", () => {
  assert.equal(inDateRange("2026-08-31T23:30:00", "2026-08-01", "2026-08-31"), true);
  assert.equal(inDateRange("2026-09-01T00:00:00", "2026-08-01", "2026-08-31"), false);
});
