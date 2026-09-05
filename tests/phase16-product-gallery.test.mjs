import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const inventory = fs.readFileSync("app/inventario/page.tsx", "utf8");
const detail = fs.readFileSync("app/inventario/[id]/page.tsx", "utf8");
const storeDetail = fs.readFileSync("app/tienda/[id]/page.tsx", "utf8");
const migration = fs.readFileSync("supabase/migration_phase16_product_gallery.sql", "utf8");

test("new products accept an accumulated gallery of at most five images", () => {
  assert.match(inventory, /MAX_PRODUCT_IMAGES = 5/);
  assert.match(inventory, /addSelectedImages/);
  assert.match(inventory, /Quitar fotografía/);
  assert.match(inventory, /Subiendo fotografía \$\{index \+ 1\} de/);
});

test("existing products use a five-photo gallery without automatic duplicate upload", () => {
  assert.match(detail, /totalPhotos >= 5/);
  assert.doesNotMatch(detail, /await uploadMainImage\(file\)/);
  assert.doesNotMatch(detail, /await uploadGalleryImage\(file\)/);
});

test("store functions fall back to the first registered gallery image", () => {
  assert.match(migration, /coalesce\(\s*i\.image_url/);
  assert.match(migration, /from public\.inventory_images ii/);
  assert.match(migration, /file_size_limit = 10485760/);
  assert.match(migration, /public\.is_admin\(\)/);
});

test("customers can open and zoom the product gallery", () => {
  assert.match(storeDetail, /Toca para ampliar/);
  assert.match(storeDetail, /role="dialog"/);
  assert.match(storeDetail, /Acercar/);
  assert.match(storeDetail, /moveLightbox/);
  assert.match(storeDetail, /Math\.min\(3/);
});
