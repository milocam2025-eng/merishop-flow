"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [stats, setStats] = useState({ clients: 0, orders: 0, sales: 0, paid: 0, pending: 0, inventory: 0, shipments: 0 });

  useEffect(() => {
    async function load() {
      const s = createClient();
      const [clients, orders, inventory, shipments] = await Promise.all([
        s.from("clients").select("id", { count: "exact", head: true }),
        s.from("orders").select("total,paid"),
        s.from("inventory").select("quantity"),
        s.from("shipments").select("id", { count: "exact", head: true })
      ]);

      const orderRows = orders.data ?? [];
      const sales = orderRows.reduce((sum, r) => sum + Number(r.total ?? 0), 0);
      const paid = orderRows.reduce((sum, r) => sum + Number(r.paid ?? 0), 0);
      const inventoryTotal = (inventory.data ?? []).reduce((sum, r) => sum + Number(r.quantity ?? 0), 0);

      setStats({
        clients: clients.count ?? 0,
        orders: orderRows.length,
        sales,
        paid,
        pending: Math.max(0, sales - paid),
        inventory: inventoryTotal,
        shipments: shipments.count ?? 0
      });
    }
    load();
  }, []);

  return (
    <AuthGuard>
      <AppShell title="Panel principal">
        <div className="cards">
          <article><span>Clientes</span><strong>{stats.clients}</strong></article>
          <article><span>Pedidos</span><strong>{stats.orders}</strong></article>
          <article><span>Ventas</span><strong>${stats.sales.toFixed(2)}</strong></article>
          <article><span>Cobrado</span><strong>${stats.paid.toFixed(2)}</strong></article>
          <article><span>Pendiente</span><strong>${stats.pending.toFixed(2)}</strong></article>
          <article><span>Inventario</span><strong>{stats.inventory}</strong></article>
          <article><span>Envíos</span><strong>{stats.shipments}</strong></article>
        </div>
        <section className="panel">
          <h2>MeriShop Flow Pro v4.1</h2>
          <p>Los módulos principales ya trabajan con la base de datos de Supabase.</p>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
