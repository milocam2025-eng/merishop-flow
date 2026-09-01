type FollowUpOrder = {
  orderNumber?: string | null;
  customerName?: string | null;
  status?: string | null;
  total?: number | null;
  paid?: number | null;
};

export function normalizePhone(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function validWhatsAppPhone(value: string | null | undefined) {
  const phone = normalizePhone(value);
  return phone.length >= 10 && phone.length <= 15;
}

export function buildOrderFollowUp(order: FollowUpOrder) {
  const name = String(order.customerName ?? "cliente").trim() || "cliente";
  const orderNumber = String(order.orderNumber ?? "tu pedido").trim() || "tu pedido";
  const status = String(order.status ?? "Pendiente");
  const total = Math.max(0, Number(order.total ?? 0));
  const paid = Math.max(0, Number(order.paid ?? 0));
  const balance = Math.max(0, total - paid);
  const money = (value: number) => value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  const details: Record<string, string> = {
    Pendiente: "Recibimos tu pedido y estamos confirmando disponibilidad, pago y entrega.",
    Nuevo: "Registramos tu pedido y comenzaremos a prepararlo.",
    Confirmado: "Tu pedido está confirmado. Te avisaremos sobre el siguiente paso.",
    Comprado: "Tus productos ya fueron comprados y continuamos con la preparación.",
    "En almacén": "Tus productos ya están en almacén y pronto prepararemos el envío.",
    "Preparando envío": "Estamos preparando tu pedido para enviarlo.",
    Pagado: "Tu pago está completo. Prepararemos el envío de tu pedido.",
    Completado: "Tu pedido fue completado. Gracias por comprar con MeriShop.",
    Cancelado: "Tu pedido fue cancelado. Si necesitas ayuda, contáctanos.",
  };

  return [
    `Hola ${name},`,
    "",
    `Actualización de ${orderNumber}:`,
    details[status] ?? `El estado actual de tu pedido es: ${status}.`,
    balance > 0 && status !== "Cancelado" ? `Saldo pendiente: ${money(balance)}.` : "",
    "",
    "Gracias por comprar con MeriShop.",
  ].filter(Boolean).join("\n");
}

export function whatsappOrderUrl(phone: string, message: string) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}
