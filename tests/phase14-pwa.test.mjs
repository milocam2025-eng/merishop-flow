import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = fs.readFileSync("app/manifest.ts", "utf8");
const page = fs.readFileSync("app/tienda/page.tsx", "utf8");
const installer = fs.readFileSync("components/PwaInstaller.tsx", "utf8");
const worker = fs.readFileSync("public/sw.js", "utf8");

test("manifest opens the public store as a standalone app", () => {
  assert.match(manifest, /id: "\/tienda"/);
  assert.match(manifest, /start_url: "\/tienda\?source=pwa"/);
  assert.match(manifest, /display: "standalone"/);
});

test("store exposes the optional installer", () => {
  assert.match(page, /<PwaInstaller \/>/);
  assert.match(installer, /beforeinstallprompt/);
  assert.match(installer, /Agregar a pantalla de inicio/);
});

test("service worker never caches API calls or navigations", () => {
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /url\.pathname\.startsWith\("\/_next\/static\/"\)/);
});
