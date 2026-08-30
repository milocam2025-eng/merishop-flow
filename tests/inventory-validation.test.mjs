import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../lib/inventory-validation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports });
const { normalizeSku, validateInventory } = module.exports;

test("normalizes SKU consistently", () => {
  assert.equal(normalizeSku(" coa-001 "), "COA-001");
});

test("accepts a complete inventory product", () => {
  const result = validateInventory({
    sku: "COA-001", product: "Bolsa Coach", category: "Bolsas",
    quantity: 1, minimumStock: 1, costUsd: 24.99,
    exchangeRate: 21.89, salePriceMxn: 675,
  });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("rejects incomplete and invalid inventory values", () => {
  const result = validateInventory({
    sku: "", product: " ", category: "", quantity: -1,
    minimumStock: 1.5, costUsd: -2, exchangeRate: 0, salePriceMxn: 0,
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 8);
});
