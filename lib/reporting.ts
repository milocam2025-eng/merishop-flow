export type ReportOrder = {
  total?: number | null;
  total_mxn?: number | null;
  paid?: number | null;
  status?: string | null;
  source?: string | null;
  created_at?: string;
};

export type OrderSummary = {
  sales: number;
  paid: number;
  balance: number;
  orders: number;
};

export function orderTotalMXN(order: ReportOrder) {
  const value = order.source === "tienda"
    ? order.total_mxn ?? order.total
    : order.total;
  const total = Number(value ?? 0);
  return Number.isFinite(total) ? Math.max(0, total) : 0;
}

export function isActiveOrder(order: ReportOrder) {
  return order.status !== "Cancelado";
}

export function inDateRange(
  createdAt: string,
  startDate: string,
  endDate: string
) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (created < start) return false;
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);
    if (created > end) return false;
  }

  return true;
}

export function summarizeOrders(orders: ReportOrder[]): OrderSummary {
  return orders.filter(isActiveOrder).reduce<OrderSummary>(
    (summary, order) => {
      const total = orderTotalMXN(order);
      const paid = Math.max(0, Number(order.paid ?? 0));
      summary.sales += total;
      summary.paid += paid;
      summary.balance += Math.max(0, total - paid);
      summary.orders += 1;
      return summary;
    },
    { sales: 0, paid: 0, balance: 0, orders: 0 }
  );
}
