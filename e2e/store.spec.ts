import { expect, test } from "@playwright/test";

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

test("the empty cart offers a route back to the store", async ({ page }) => {
  await page.goto("/carrito");

  await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
  await page.getByRole("link", { name: "Ver productos" }).click();
  await expect(page).toHaveURL(/\/tienda$/);
});

test("the admin login form remains available", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "MeriShop Flow Pro" })).toBeVisible();
  await expect(page.getByLabel("Correo", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
});
