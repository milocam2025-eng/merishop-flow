export function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMXN(value?: number | null) {
  return Number(value ?? 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

export function formatUSD(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
