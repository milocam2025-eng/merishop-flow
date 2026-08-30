import { expect, test } from "@playwright/test";

const cartProduct = {
  id: "11111111-1111-4111-8111-111111111111",
  product: "Bolsa Coach de prueba",
  brand: "Coach",
  size: "Mediana",
  color: "Verde",
  price: 3000,
  image: "",
  stock: 3,
  quantity: 1,
};

test("the public store exposes search and cart navigation", async ({ page }) => {
  await page.route("**/rest/v1/rpc/list_store_products", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", json: [] })
  );

  await page.goto("/tienda");
  await expect(page.getByRole("heading", { name: "MeriShop" })).toBeVisible();
  await expect(page.getByPlaceholder("🔎 Buscar productos...")).toBeVisible();

  await page.getByRole("link", { name: /Ver carrito/ }).click();
  await expect(page).toHaveURL(/\/carrito$/);
  await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
});

test("the cart restores products and recalculates quantities", async ({ page }) => {
  await page.addInitScript((product) => {
    window.localStorage.setItem("merishop_cart", JSON.stringify([product]));
  }, cartProduct);

  await page.goto("/carrito");
  await expect(page.getByRole("heading", { name: "Mi carrito" })).toBeVisible();
  await expect(page.getByText(cartProduct.product)).toBeVisible();
  await expect(page.getByText("$3,000.00").first()).toBeVisible();

  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("$6,000.00").first()).toBeVisible();
});

test("the admin login form remains available", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "MeriShop Flow Pro" })).toBeVisible();
  await expect(page.getByLabel("Correo", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
});
