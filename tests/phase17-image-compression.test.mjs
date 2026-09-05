import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const helper = fs.readFileSync("lib/product-image.ts", "utf8");
const inventory = fs.readFileSync("app/inventario/page.tsx", "utf8");
const detail = fs.readFileSync("app/inventario/[id]/page.tsx", "utf8");

test("large product photos are resized and converted before upload", () => {
  assert.match(helper, /MAX_IMAGE_SIDE = 2400/);
  assert.match(helper, /canvas\.toBlob\(resolve, "image\/jpeg", 0\.86\)/);
  assert.match(helper, /blob\.size > 10 \* 1024 \* 1024/);
});

test("new and existing inventory uploads prepare oversized images", () => {
  assert.match(inventory, /await prepareProductImage\(originalFile\)/);
  assert.match(detail, /await prepareProductImage\(file\)/);
  assert.doesNotMatch(inventory, /supera el límite de 10 MB/);
  assert.doesNotMatch(detail, /no puede superar 10 MB/);
});
