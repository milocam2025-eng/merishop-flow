import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../lib/store-cart.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports });
const { addCartItem, cartItemCount, parseStoredCart } = module.exports;

const product = { id: "1", product: "Bolsa Coach", price: 675, stock: 2, quantity: 1 };

test("cart parser rejects malformed stored values", () => {
  assert.equal(parseStoredCart("not-json").length, 0);
  assert.equal(parseStoredCart(JSON.stringify([{ product: "Sin ID" }])).length, 0);
});

test("cart adds products and respects available stock", () => {
  const first = addCartItem([], product);
  assert.equal(first.added, true);
  const second = addCartItem(first.items, product);
  assert.equal(second.items[0].quantity, 2);
  const blocked = addCartItem(second.items, product);
  assert.equal(blocked.added, false);
  assert.equal(cartItemCount(blocked.items), 2);
});
