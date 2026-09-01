import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../lib/order-followup.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports });
const { buildOrderFollowUp, normalizePhone, validWhatsAppPhone, whatsappOrderUrl } = module.exports;

test("normalizes and validates WhatsApp numbers", () => {
  assert.equal(normalizePhone("+52 (999) 123-4567"), "529991234567");
  assert.equal(validWhatsAppPhone("9991234567"), true);
  assert.equal(validWhatsAppPhone("123"), false);
});

test("builds a status-aware order message with balance", () => {
  const message = buildOrderFollowUp({
    orderNumber: "MS-100", customerName: "Ana", status: "Confirmado",
    total: 1000, paid: 300,
  });
  assert.match(message, /Hola Ana/);
  assert.match(message, /pedido está confirmado/i);
  assert.match(message, /700/);
  assert.match(whatsappOrderUrl("999 123 4567", message), /^https:\/\/wa\.me\/9991234567\?text=/);
});

test("cancelled orders do not request a pending balance", () => {
  const message = buildOrderFollowUp({ status: "Cancelado", total: 1000, paid: 0 });
  assert.doesNotMatch(message, /Saldo pendiente/);
});
