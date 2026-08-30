export type InventoryValidationInput = {
  sku?: string | null;
  product?: string | null;
  category?: string | null;
  quantity?: number | string | null;
  minimumStock?: number | string | null;
  costUsd?: number | string | null;
  exchangeRate?: number | string | null;
  salePriceMxn?: number | string | null;
};

function finiteNumber(value: number | string | null | undefined) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSku(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

export function validateInventory(input: InventoryValidationInput) {
  const errors: string[] = [];
  const product = String(input.product ?? "").trim();
  const sku = normalizeSku(input.sku);
  const category = String(input.category ?? "").trim();
  const quantity = finiteNumber(input.quantity);
  const minimumStock = finiteNumber(input.minimumStock);
  const costUsd = finiteNumber(input.costUsd);
  const exchangeRate = finiteNumber(input.exchangeRate);
  const salePriceMxn = finiteNumber(input.salePriceMxn);

  if (product.length < 2) errors.push("Escribe un nombre de producto válido.");
  if (!sku) errors.push("El SKU es obligatorio.");
  if (!category) errors.push("Selecciona o escribe una categoría.");
  if (quantity === null || !Number.isInteger(quantity) || quantity < 0) {
    errors.push("La cantidad debe ser un número entero igual o mayor que cero.");
  }
  if (minimumStock === null || !Number.isInteger(minimumStock) || minimumStock < 0) {
    errors.push("El stock mínimo debe ser un número entero igual o mayor que cero.");
  }
  if (costUsd === null || costUsd < 0) errors.push("El costo USD no puede ser negativo.");
  if (exchangeRate === null || exchangeRate <= 0) {
    errors.push("Escribe un tipo de cambio mayor que cero.");
  }
  if (salePriceMxn === null || salePriceMxn <= 0) {
    errors.push("Escribe un precio de venta mayor que cero.");
  }

  return { valid: errors.length === 0, errors, normalizedSku: sku };
}
