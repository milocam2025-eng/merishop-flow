import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../lib/formatters.ts", import.meta.url),
  "utf8"
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const module = { exports: {} };
new Function("module", "exports", javascript)(module, module.exports);
const { formatMXN, formatUSD, numberValue } = module.exports;

test("numberValue converts valid input and rejects invalid input", () => {
  assert.equal(numberValue("18.5"), 18.5);
  assert.equal(numberValue("not-a-number"), 0);
});

test("currency formatters use the expected currencies", () => {
  assert.match(formatMXN(675), /675/);
  assert.match(formatMXN(675), /\$/);
  assert.match(formatUSD(24.99), /24\.99/);
  assert.equal(formatMXN(null), "$0.00");
});
