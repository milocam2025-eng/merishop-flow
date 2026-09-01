"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { inDateRange, orderTotalMXN, summarizeOrders } from "@/lib/reporting";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  product: string;
  total: number;
  total_mxn?: number | null;
  paid: number;
  status: string;
  source?: string | null;
  client_id: string | null;
  created_at: string;
};

type Payment = {
  amount: number;
  method: string | null;
  created_at: string;
};

type Client = {
  id: string;
  name: string;
};

type Inventory = {
  id: string;
  product: string;
  quantity: number;
  minimum_stock: number | null;
  total_cost_mxn: number | null;
  sale_price_mxn: number | null;
  profit_mxn: number | null;
};
type Shipment = {
  id: string;
  carrier: string | null;
  tracking: string | null;
  status: string;
  created_at: string;
};
function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
const [clients, setClients] = useState<Client[]>([]);
const [inventory, setInventory] = useState<Inventory[]>([]);
const [shipments, setShipments] = useState<Shipment[]>([]);
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");

  useEffect(() => {
  async function load() {
    const s = createClient();

    const [
      ordersResult,
      paymentsResult,
      clientsResult,
      inventoryResult,
      shipmentsResult,
    ] = await Promise.all([
      s.from("orders")
        .select("id,product,total,total_mxn,paid,status,source,client_id,created_at")
        .order("created_at", { ascending: false }),

      s.from("payments")
        .select("amount,method,created_at")
        .order("created_at", { ascending: false }),

      s.from("clients")
        .select("id,name")
        .order("name"),

      s.from("inventory")
        .select(
          "id,product,quantity,minimum_stock,total_cost_mxn,sale_price_mxn,profit_mxn"
        )
        .order("product"),

      s.from("shipments")
  .select("id,carrier,tracking,status,created_at")    
  .order("created_at", { ascending: false }),
    ]);

    setOrders((ordersResult.data as Order[]) ?? []);
    setPayments((paymentsResult.data as Payment[]) ?? []);
    setClients((clientsResult.data as Client[]) ?? []);
    setInventory((inventoryResult.data as Inventory[]) ?? []);
    setShipments((shipmentsResult.data as Shipment[]) ?? []);
  }

  load();
}, []);

const periodOrders = useMemo(
  () => orders.filter((order) => inDateRange(order.created_at, startDate, endDate)),
  [orders, startDate, endDate]
);

const periodPayments = useMemo(
  () => payments.filter((payment) => inDateRange(payment.created_at, startDate, endDate)),
  [payments, startDate, endDate]
);

const activeOrders = periodOrders.filter(
  (order) => order.status !== "Cancelado"
);
const orderSummary = summarizeOrders(activeOrders);
const activeSales = orderSummary.sales;
const activePaid = orderSummary.paid;
const pendingBalance = orderSummary.balance;

const pendingOrders = activeOrders.filter(
  (order) =>
    orderTotalMXN(order) >
    Number(order.paid || 0)
).length;

const paidOrders = periodOrders.filter(
  (order) => order.status === "Pagado"
).length;

const inventoryUnits = inventory.reduce(
  (sum, item) => sum + Number(item.quantity || 0),
  0
);

const lowStockItems = inventory.filter(
  (item) =>
    Number(item.quantity || 0) <=
    Number(item.minimum_stock || 0)
).length;

const inventoryValue = inventory.reduce(
  (sum, item) =>
    sum +
    Number(item.total_cost_mxn || 0) *
      Number(item.quantity || 0),
  0
);

const potentialProfit = inventory.reduce(
  (sum, item) =>
    sum +
    Number(item.profit_mxn || 0) *
      Number(item.quantity || 0),
  0
);

const pendingShipments = shipments.filter(
  (shipment) =>
    shipment.status !== "Entregado"
).length;
const recentOrders = orders
  .filter((order) => order.status !== "Cancelado")
  .slice(0, 5);

const lowStock = inventory
  .filter((item) => {
    const minimum = Number(item.minimum_stock || 0);

    return (
      Number(item.quantity || 0) <= minimum
    );
  })
  .slice(0, 5);

const recentPayments = periodPayments.slice(0, 5);

const recentShipments = shipments.slice(0, 5);
const today = new Date();

const last30Days = Array.from({ length: 30 }, (_, index) => {
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (29 - index));

  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  const sales = orders
    .filter((order) => {
      if (order.status === "Cancelado") return false;

      const created = new Date(order.created_at);

      return created >= date && created < nextDate;
    })
    .reduce(
      (sum, order) => sum + orderTotalMXN(order),
      0
    );

  return {
    date,
    label: date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    }),
    sales,
  };
});
const previous30Days = orders.filter((order) => {
  const created = new Date(order.created_at);

  return (
    created >= new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000) &&
    created < new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) &&
    order.status !== "Cancelado"
  );
});

const salesLast30Days = last30Days.reduce(
  (sum, day) => sum + day.sales,
  0
);

const previous30DaysSales = previous30Days.reduce(
  (sum, order) => sum + orderTotalMXN(order),
  0
);
const salesTrend =
  previous30DaysSales > 0
    ? ((salesLast30Days - previous30DaysSales) /
        previous30DaysSales) * 100
    : salesLast30Days > 0
      ? 100
      : 0;

const salesTrendLabel =
  salesTrend > 0
    ? "Crecimiento"
    : salesTrend < 0
      ? "Disminución"
      : "Sin cambios";
const maxDailySales = Math.max(
  ...last30Days.map((day) => day.sales),
  1
);
const clientName = (clientId: string | null) =>
  clients.find((client) => client.id === clientId)?.name ||
  "Sin asignar";

const productRanking = Object.values(
  activeOrders.reduce(
    (acc, order) => {
      const key = order.product || "Sin producto";

      if (!acc[key]) {
        acc[key] = {
          product: key,
          orders: 0,
          sales: 0,
        };
      }

      acc[key].orders += 1;
      acc[key].sales += orderTotalMXN(order);

      return acc;
    },
    {} as Record<
      string,
      {
        product: string;
        orders: number;
        sales: number;
      }
    >
  )
)
  .sort((a, b) => b.sales - a.sales)
  .slice(0, 5);

const maxProductSales = Math.max(
  ...productRanking.map((item) => item.sales),
  1
);
const clientRankingMap = new Map<
  string,
  {
    id: string;
    name: string;
    orders: number;
    sales: number;
    paid: number;
    balance: number;
  }
>();

activeOrders.forEach((order) => {
  if (!order.client_id) return;

  const clientId = order.client_id;
  const name = clientName(clientId);

  const total = orderTotalMXN(order);
  const paidAmount = Number(order.paid || 0);

  const current = clientRankingMap.get(clientId) || {
    id: clientId,
    name,
    orders: 0,
    sales: 0,
    paid: 0,
    balance: 0,
  };

  current.orders += 1;
  current.sales += total;
  current.paid += paidAmount;
  current.balance += Math.max(0, total - paidAmount);

  clientRankingMap.set(clientId, current);
});

const clientRanking = Array.from(
  clientRankingMap.values()
)
  .sort((a, b) => b.sales - a.sales)
  .slice(0, 5);

const maxClientSales = Math.max(
  ...clientRanking.map((client) => client.sales),
  1
);
const paymentMethods = Object.values(
  periodPayments.reduce(
    (acc, payment) => {
      const method = payment.method || "Sin método";
      const amount = Number(payment.amount || 0);

      if (!acc[method]) {
        acc[method] = {
          method,
          amount: 0,
          count: 0,
        };
      }

      acc[method].amount += amount;
      acc[method].count += 1;

      return acc;
    },
    {} as Record<
      string,
      {
        method: string;
        amount: number;
        count: number;
      }
    >
  )
).sort((a, b) => b.amount - a.amount);

const totalPaymentsAmount = paymentMethods.reduce(
  (sum, item) => sum + item.amount,
  0
);
  function exportOrders() {
    downloadCsv("merishop-pedidos.csv", [
      ["Fecha","Producto","Total","Pagado","Saldo","Estado"],
      ...periodOrders.map(r => [
        new Date(r.created_at).toLocaleDateString("es-MX"),
        r.product,
        orderTotalMXN(r).toFixed(2),
        Number(r.paid).toFixed(2),
        Math.max(0, orderTotalMXN(r)-Number(r.paid)).toFixed(2),
        r.status
      ])
    ]);
  }

  function exportPayments() {
    downloadCsv("merishop-pagos.csv", [
      ["Fecha","Monto","Método"],
      ...periodPayments.map(r => [
        new Date(r.created_at).toLocaleDateString("es-MX"),
        Number(r.amount).toFixed(2),
        r.method || ""
      ])
    ]);
  }

  return (
    <AuthGuard>
      <AppShell title="Reportes">
<section className="panel" style={{ marginBottom: 20 }}>
  <div className="section-title">
    <div>
      <h2>Periodo del reporte</h2>
      <p>Filtra ventas, cobros, rankings y archivos CSV.</p>
    </div>
  </div>
  <div
    style={{
      display: "flex",
      gap: 14,
      flexWrap: "wrap",
      alignItems: "end",
    }}
  >
    <label>
      Desde
      <input
        type="date"
        value={startDate}
        max={endDate || undefined}
        onChange={(event) => setStartDate(event.target.value)}
      />
    </label>
    <label>
      Hasta
      <input
        type="date"
        value={endDate}
        min={startDate || undefined}
        onChange={(event) => setEndDate(event.target.value)}
      />
    </label>
    <button
      type="button"
      className="secondary-action"
      onClick={() => {
        setStartDate("");
        setEndDate("");
      }}
      disabled={!startDate && !endDate}
    >
      Mostrar todo
    </button>
    <strong style={{ marginLeft: "auto" }}>
      {activeOrders.length} pedidos activos
    </strong>
  </div>
</section>
<section
  className="panel"
  style={{
    padding: 26,
    borderRadius: 22,
    background:
      "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 20,
      flexWrap: "wrap",
    }}
  >
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "#2563eb",
          marginBottom: 6,
        }}
      >
        MeriShop Intelligence
      </div>

      <h2
        style={{
          margin: 0,
          fontSize: 30,
        }}
      >
        Dashboard Ejecutivo
      </h2>

      <p
        style={{
          marginTop: 7,
          marginBottom: 0,
          opacity: 0.68,
        }}
      >
        Vista general del rendimiento comercial.
      </p>
    </div>

    <div
      style={{
        padding: "10px 14px",
        borderRadius: 999,
        background:
          salesTrend > 0
            ? "#dcfce7"
            : salesTrend < 0
              ? "#fee2e2"
              : "#eef2f7",
        color:
          salesTrend > 0
            ? "#166534"
            : salesTrend < 0
              ? "#991b1b"
              : "#475569",
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      {salesTrend > 0
        ? "▲ "
        : salesTrend < 0
          ? "▼ "
          : "• "}
      {Math.abs(salesTrend).toFixed(1)}%{" "}
      {salesTrendLabel}
    </div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(210px, 1fr))",
      gap: 16,
      marginTop: 28,
    }}
  >
    {/* VENTAS */}
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, #eff6ff, #ffffff)",
        border: "1px solid #dbeafe",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.72 }}>
        💰 Ventas activas
      </div>

      <div
        style={{
          fontSize: 29,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        ${activeSales.toFixed(2)}
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 6,
          opacity: 0.65,
        }}
      >
        Pedidos no cancelados
      </div>
    </div>

    {/* COBRADO */}
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, #ecfdf5, #ffffff)",
        border: "1px solid #d1fae5",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.72 }}>
        💳 Cobrado
      </div>

      <div
        style={{
          fontSize: 29,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        ${activePaid.toFixed(2)}
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 6,
          opacity: 0.65,
        }}
      >
        Pagado en pedidos
      </div>
    </div>

    {/* POR COBRAR */}
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background:
          pendingBalance > 0
            ? "linear-gradient(135deg, #fff7ed, #ffffff)"
            : "linear-gradient(135deg, #f0fdf4, #ffffff)",
        border:
          pendingBalance > 0
            ? "1px solid #fed7aa"
            : "1px solid #bbf7d0",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.72 }}>
        ⏳ Por cobrar
      </div>

      <div
        style={{
          fontSize: 29,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        ${pendingBalance.toFixed(2)}
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 6,
          opacity: 0.65,
        }}
      >
        {pendingOrders} pedido
        {pendingOrders !== 1 ? "s" : ""} pendiente
        {pendingOrders !== 1 ? "s" : ""}
      </div>
    </div>

    {/* PEDIDOS PAGADOS */}
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, #eef2ff, #ffffff)",
        border: "1px solid #e0e7ff",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.72 }}>
        ✅ Pedidos pagados
      </div>

      <div
        style={{
          fontSize: 29,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        {paidOrders}
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 6,
          opacity: 0.65,
        }}
      >
        Ventas liquidadas
      </div>
    </div>

    {/* CLIENTES */}
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, #faf5ff, #ffffff)",
        border: "1px solid #f3e8ff",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.72 }}>
        👥 Clientes
      </div>

      <div
        style={{
          fontSize: 29,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        {clients.length}
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 6,
          opacity: 0.65,
        }}
      >
        Clientes registrados
      </div>
    </div>

    {/* INVENTARIO */}
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, #fff7ed, #ffffff)",
        border: "1px solid #ffedd5",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.72 }}>
        📦 Inventario
      </div>

      <div
        style={{
          fontSize: 29,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        {inventoryUnits}
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 6,
          opacity: 0.65,
        }}
      >
        {lowStockItems} con stock bajo
      </div>
    </div>

    {/* ENVÍOS */}
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background:
          pendingShipments > 0
            ? "linear-gradient(135deg, #fefce8, #ffffff)"
            : "linear-gradient(135deg, #f0fdf4, #ffffff)",
        border: "1px solid #fef3c7",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.72 }}>
        🚚 Envíos pendientes
      </div>

      <div
        style={{
          fontSize: 29,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        {pendingShipments}
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 6,
          opacity: 0.65,
        }}
      >
        Sin entregar
      </div>
    </div>

    {/* GANANCIA */}
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, #f0fdf4, #ffffff)",
        border: "1px solid #dcfce7",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.72 }}>
        📈 Ganancia potencial
      </div>

      <div
        style={{
          fontSize: 29,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        ${potentialProfit.toFixed(2)}
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 6,
          opacity: 0.65,
        }}
      >
        Inventario actual
      </div>
    </div>
  </div>
</section>
<section className="panel" style={{ marginTop: 20 }}>
  <div className="section-title">
    <div>
      <h2>🏆 Productos más vendidos</h2>
      <p>Ranking por valor total de ventas.</p>
    </div>
  </div>

  <div style={{ marginTop: 20 }}>
    {productRanking.length > 0 ? (
      productRanking.map((item, index) => {
        const percentage =
          (item.sales / maxProductSales) * 100;

        return (
          <div
            key={item.product}
            style={{
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                gap: 12,
              }}
            >
              <div>
                <strong>
                  {index + 1}. {item.product}
                </strong>

                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.7,
                    marginTop: 3,
                  }}
                >
                  {item.orders} pedido
                  {item.orders !== 1 ? "s" : ""}
                </div>
              </div>

              <strong>
                ${item.sales.toFixed(2)}
              </strong>
            </div>

            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: "#e5e7eb",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${percentage}%`,
                  height: "100%",
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg, #2563eb, #1d4ed8)",
                }}
              />
            </div>
          </div>
        );
      })
    ) : (
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        No hay suficientes ventas para generar un ranking.
      </div>
    )}
  </div>
</section>
<section className="panel" style={{ marginTop: 20 }}>
  <div className="section-title">
    <div>
      <h2>👑 Clientes VIP</h2>
      <p>Clientes con mayor valor de compras.</p>
    </div>
  </div>

  <div style={{ marginTop: 20 }}>
    {clientRanking.length > 0 ? (
      clientRanking.map((client, index) => {
        const percentage =
          (client.sales / maxClientSales) * 100;

        return (
          <div
            key={client.id}
            style={{
              padding: "16px 0",
              borderBottom:
                index < clientRanking.length - 1
                  ? "1px solid #e5e7eb"
                  : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <strong style={{ fontSize: 16 }}>
                  {index === 0 ? "🥇 " : ""}
                  {index === 1 ? "🥈 " : ""}
                  {index === 2 ? "🥉 " : ""}
                  {client.name}
                </strong>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    opacity: 0.7,
                  }}
                >
                  {client.orders} pedido
                  {client.orders !== 1 ? "s" : ""}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <strong>
                  ${client.sales.toFixed(2)}
                </strong>

                <div
                  style={{
                    fontSize: 12,
                    marginTop: 3,
                    opacity: 0.7,
                  }}
                >
                  Saldo: ${client.balance.toFixed(2)}
                </div>
              </div>
            </div>

            <div
              style={{
                height: 8,
                marginTop: 12,
                borderRadius: 999,
                background: "#e5e7eb",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${percentage}%`,
                  height: "100%",
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg, #7c3aed, #4f46e5)",
                }}
              />
            </div>
          </div>
        );
      })
    ) : (
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        No hay clientes con compras activas todavía.
      </div>
    )}
  </div>
</section>

{/* CENTRO DE OPERACIONES PREMIUM */}
<section
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: 20,
    marginTop: 20,
  }}
>
  {/* PEDIDOS RECIENTES */}
  <div className="panel">
    <div className="section-title">
      <div>
        <h2>🧾 Pedidos recientes</h2>
        <p>Actividad comercial más reciente.</p>
      </div>
    </div>

    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Producto</th>
            <th>Total</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <tr key={order.id}>
                <td>{clientName(order.client_id)}</td>
                <td>{order.product}</td>
                <td>${orderTotalMXN(order).toFixed(2)}</td>
                <td>{order.status}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>No hay pedidos activos.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>

  {/* ALERTAS DE INVENTARIO */}
  <div className="panel">
    <div className="section-title">
      <div>
        <h2>📦 Alertas de inventario</h2>
        <p>Productos que requieren atención.</p>
      </div>
    </div>

    {lowStock.length > 0 ? (
      <div style={{ marginTop: 16 }}>
        {lowStock.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 0",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div>
              <strong>{item.product}</strong>
              <div
                style={{
                  fontSize: 13,
                  marginTop: 4,
                  opacity: 0.7,
                }}
              >
                Existencia actual
              </div>
            </div>

            <strong>
              {Number(item.quantity || 0)} unidades
            </strong>
          </div>
        ))}
      </div>
    ) : (
      <div
        style={{
          marginTop: 18,
          padding: 20,
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        ✅ Inventario en niveles adecuados.
      </div>
    )}
  </div>

  {/* ÚLTIMOS PAGOS */}
  <div className="panel">
    <div className="section-title">
      <div>
        <h2>💳 Últimos pagos</h2>
        <p>Movimientos recibidos recientemente.</p>
      </div>
    </div>

    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Método</th>
          </tr>
        </thead>

        <tbody>
          {recentPayments.length > 0 ? (
            recentPayments.map((payment, index) => (
              <tr key={`${payment.created_at}-${index}`}>
                <td>
                  {new Date(
                    payment.created_at
                  ).toLocaleDateString("es-MX")}
                </td>

                <td>
                  ${Number(payment.amount || 0).toFixed(2)}
                </td>

                <td>{payment.method || "-"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>No hay pagos registrados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>

  {/* ÚLTIMOS ENVÍOS */}
  <div className="panel">
    <div className="section-title">
      <div>
        <h2>🚚 Últimos envíos</h2>
        <p>Seguimiento de logística reciente.</p>
      </div>
    </div>

    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Paquetería</th>
            <th>Rastreo</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {recentShipments.length > 0 ? (
            recentShipments.map((shipment) => (
              <tr key={shipment.id}>
                <td>{shipment.carrier || "-"}</td>
                <td>{shipment.tracking || "-"}</td>
                <td>{shipment.status}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>No hay envíos registrados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
</section>
        
        <section className="panel">
          <div className="section-title">
            <div><h2>Exportar información</h2><p>Descarga tus datos para abrirlos en Excel.</p></div>
          </div>
          <div className="action-row">
            <button onClick={exportOrders}>Exportar pedidos CSV</button>
            <button className="secondary-action" onClick={exportPayments}>Exportar pagos CSV</button>
          </div>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
