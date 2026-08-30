import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/logger.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const module = { exports: {} };
new Function("module", "exports", javascript)(module, module.exports);
const { safeErrorDetails } = module.exports;

test("logger hides sensitive fields", () => {
  const result = safeErrorDetails({
    customer_phone: "9991234567",
    email: "cliente@example.com",
    action: "checkout",
  });
  assert.equal(result.customer_phone, "[dato oculto]");
  assert.equal(result.email, "[dato oculto]");
  assert.equal(result.action, "checkout");
});

test("logger removes contact details from error messages", () => {
  const result = safeErrorDetails(
    new Error("Falló cliente@example.com con teléfono +52 999 123 4567")
  );
  assert.equal(result.message, "Falló [correo oculto] con teléfono [teléfono oculto]");
});
