import { expect, test } from "@playwright/test";

test("the public store exposes search and cart navigation", async ({ page }) => {
  await page.route("**/*", (route) => {
    if (!route.request().url().includes("/rpc/list_store_products")) {
      return route.continue();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      json: [
        { id: "1", product: "Bolsa Coach", brand: "Coach", category: "Bolsas", sale_price_mxn: 675, quantity: 2, status: "Disponible" },
        { id: "2", product: "Tenis Nike", brand: "Nike", category: "Calzado", sale_price_mxn: 1200, quantity: 1, status: "Stock bajo" },
      ],
    });
  });

  await page.goto("/tienda");
  await expect(page.getByRole("heading", { name: "MeriShop" })).toBeVisible();
  await expect(page.getByPlaceholder("🔎 Buscar productos...")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bolsa Coach" })).toBeVisible();
  await expect(page.getByText("2 productos")).toBeVisible();

  await page.getByPlaceholder("🔎 Buscar productos...").fill("Coach");
  await expect(page.getByRole("heading", { name: "Bolsa Coach" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tenis Nike" })).not.toBeVisible();
  await page.getByRole("button", { name: "🛒 Agregar al carrito" }).click();
  await expect(page.getByRole("status")).toContainText("se agregó al carrito");
  const headerCartLink = page.getByRole("link", { name: /Ver carrito \(1\)/ });
  await expect(headerCartLink).toBeVisible();

  await headerCartLink.click();
  await expect(page).toHaveURL(/\/carrito$/);
  await expect(page.getByRole("heading", { name: "Bolsa Coach" })).toBeVisible();
});

test("the empty cart offers a route back to the store", async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("merishop_cart"));
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

test("health and missing-page responses are controlled", async ({ page, request }) => {
  const health = await request.get("/api/health");
  const healthBody = await health.json();

  expect([200, 503]).toContain(health.status());
  expect(healthBody).toMatchObject({ service: "merishop-flow" });

  if (health.ok()) {
    expect(healthBody).toMatchObject({
      status: "ok",
      checks: { database: "ok" },
    });
  } else {
    expect(healthBody).toMatchObject({ status: "degraded" });
    expect(["error", "configuration_error"]).toContain(
      healthBody.checks?.database
    );
  }

  await page.goto("/ruta-que-no-existe");
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir a MeriShop" })).toBeVisible();
});
