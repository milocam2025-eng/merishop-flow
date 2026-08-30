import { expect, test, type Page } from "@playwright/test";

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  product: "Bolsa Coach de prueba",
  brand: "Coach",
  category: "Bolsas",
  size: "Mediana",
  color: "Verde",
  image_url: null,
  sale_price_mxn: 3000,
  quantity: 2,
  status: "Disponible",
};

async function mockStoreApi(page: Page) {
  await page.route("**/rest/v1/rpc/list_store_products", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", json: [product] })
  );
  await page.route("**/rest/v1/rpc/get_store_product", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", json: product })
  );
  await page.route("**/rest/v1/rpc/list_store_product_images", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", json: [] })
  );
}

test("the public catalog can search and open a product", async ({ page }) => {
  await mockStoreApi(page);
  await page.goto("/tienda");

  await expect(page.getByRole("heading", { name: "MeriShop" })).toBeVisible();
  await expect(page.getByText(product.product)).toBeVisible();

  await page.getByPlaceholder("🔎 Buscar productos...").fill("Coach");
  await page.getByRole("link", { name: /Bolsa Coach de prueba/ }).click();

  await expect(page).toHaveURL(`/tienda/${product.id}`);
  await expect(page.getByRole("heading", { name: product.product })).toBeVisible();
  await expect(page.getByText("$3,000.00")).toBeVisible();
});

test("adding a product updates the cart", async ({ page }) => {
  await mockStoreApi(page);
  await page.goto(`/tienda/${product.id}`);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Agregar al carrito/ }).click();
  await page.goto("/carrito");

  await expect(page.getByRole("heading", { name: "Mi carrito" })).toBeVisible();
  await expect(page.getByText(product.product)).toBeVisible();
  await expect(page.getByText("$3,000.00").first()).toBeVisible();
});

test("an unauthenticated visitor is redirected from admin pages", async ({ page }) => {
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", json: { message: "Unauthorized" } })
  );

  await page.goto("/inventario");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "MeriShop Flow Pro" })).toBeVisible();
});
