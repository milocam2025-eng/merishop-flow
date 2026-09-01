"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { orderTotalMXN, summarizeOrders } from "@/lib/reporting";
import { createClient } from "@/lib/supabase/client";

type Order = { total: number; total_mxn?: number | null; paid: number; status: string; source?: string | null; created_at: string };
type Inventory = { quantity: number; status: string };
type Payment = { amount: number; created_at: string };

export default function DashboardPage() {
  const [stats, setStats] = useState({
    clients: 0,
    orders: 0,
    sales: 0,
    paid: 0,
    pending: 0,
    inventory: 0,
    shipments: 0,
    monthSales: 0,
    monthPayments: 0
  });

  const [recent, setRecent] = useState<Order[]>([]);

  useEffect(() => {
    async function load() {
      const s = createClient();
      const [clients, orders, inventory, shipments, payments] = await Promise.all([
        s.from("clients").select("id", { count: "exact", head: true }),
        s.from("orders").select("total,total_mxn,paid,status,source,created_at").order("created_at", { ascending: false }),
        s.from("inventory").select("quantity,status"),
        s.from("shipments").select("id", { count: "exact", head: true }),
        s.from("payments").select("amount,created_at")
      ]);

      const orderRows = (orders.data ?? []) as Order[];
      const inventoryRows = (inventory.data ?? []) as Inventory[];
      const paymentRows = (payments.data ?? []) as Payment[];

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const activeOrders = orderRows.filter((order) => order.status !== "Cancelado");
      const summary = summarizeOrders(activeOrders);
      const sales = summary.sales;
      const paid = summary.paid;
      const inventoryTotal = inventoryRows.reduce((sum, r) => sum + Number(r.quantity ?? 0), 0);

      const monthSales = activeOrders
        .filter(r => new Date(r.created_at) >= monthStart)
        .reduce((sum, r) => sum + orderTotalMXN(r), 0);

      const monthPayments = paymentRows
        .filter(r => new Date(r.created_at) >= monthStart)
        .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

      setStats({
        clients: clients.count ?? 0,
        orders: activeOrders.length,
        sales,
        paid,
        pending: Math.max(0, sales - paid),
        inventory: inventoryTotal,
        shipments: shipments.count ?? 0,
        monthSales,
        monthPayments
      });

      setRecent(activeOrders.slice(0, 5));
    }

    load();
  }, []);

  return (
    <AuthGuard>
      <AppShell title="Panel principal">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">Resumen del negocio</span>
            <h2>Controla ventas, cobros e inventario desde un solo lugar.</h2>
            <p>Los datos se actualizan desde tu base de datos de Supabase.</p>
          </div>
          <div className="hero-number">
            <span>Ventas del mes</span>
            <strong>${stats.monthSales.toFixed(2)}</strong>
            <small>Cobrado este mes: ${stats.monthPayments.toFixed(2)}</small>
          </div>
        </section>

        <div className="cards">
          <article><span>Clientes</span><strong>{stats.clients}</strong><small>registrados</small></article>
          <article><span>Pedidos</span><strong>{stats.orders}</strong><small>totales</small></article>
          <article><span>Ventas</span><strong>${stats.sales.toFixed(2)}</strong><small>acumuladas</small></article>
          <article><span>Cobrado</span><strong>${stats.paid.toFixed(2)}</strong><small>recibido</small></article>
          <article><span>Saldo pendiente</span><strong>${stats.pending.toFixed(2)}</strong><small>por cobrar</small></article>
          <article><span>Inventario</span><strong>{stats.inventory}</strong><small>unidades</small></article>
          <article><span>Envíos</span><strong>{stats.shipments}</strong><small>registrados</small></article>
        </div>

        <section className="panel">
          <div className="section-title">
            <div><h2>Pedidos recientes</h2><p>Últimos movimientos registrados.</p></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th></tr></thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={5}>Aún no hay pedidos registrados.</td></tr>
                ) : recent.map((r, i) => (
                  <tr key={i}>
                    <td>{new Date(r.created_at).toLocaleDateString("es-MX")}</td>
                    <td>${orderTotalMXN(r).toFixed(2)}</td>
                    <td>${Number(r.paid).toFixed(2)}</td>
                    <td>${Math.max(0, orderTotalMXN(r)-Number(r.paid)).toFixed(2)}</td>
                    <td><span className="badge">{r.status || "Nuevo"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
