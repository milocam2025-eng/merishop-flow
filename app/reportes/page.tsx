"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

type Order = { product: string; total: number; paid: number; status: string; created_at: string };
type Payment = { amount: number; method: string | null; created_at: string };

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

  useEffect(() => {
    async function load() {
      const s = createClient();
      const [o, p] = await Promise.all([
        s.from("orders").select("product,total,paid,status,created_at").order("created_at", { ascending: false }),
        s.from("payments").select("amount,method,created_at").order("created_at", { ascending: false })
      ]);
      setOrders((o.data as Order[]) ?? []);
      setPayments((p.data as Payment[]) ?? []);
    }
    load();
  }, []);

  const sales = orders.reduce((s, r) => s + Number(r.total || 0), 0);
  const paid = orders.reduce((s, r) => s + Number(r.paid || 0), 0);
  const collected = payments.reduce((s, r) => s + Number(r.amount || 0), 0);

  function exportOrders() {
    downloadCsv("merishop-pedidos.csv", [
      ["Fecha","Producto","Total","Pagado","Saldo","Estado"],
      ...orders.map(r => [
        new Date(r.created_at).toLocaleDateString("es-MX"),
        r.product,
        Number(r.total).toFixed(2),
        Number(r.paid).toFixed(2),
        Math.max(0, Number(r.total)-Number(r.paid)).toFixed(2),
        r.status
      ])
    ]);
  }

  function exportPayments() {
    downloadCsv("merishop-pagos.csv", [
      ["Fecha","Monto","Método"],
      ...payments.map(r => [
        new Date(r.created_at).toLocaleDateString("es-MX"),
        Number(r.amount).toFixed(2),
        r.method || ""
      ])
    ]);
  }

  return (
    <AuthGuard>
      <AppShell title="Reportes">
        <div className="cards">
          <article><span>Ventas registradas</span><strong>${sales.toFixed(2)}</strong><small>pedidos</small></article>
          <article><span>Pagado en pedidos</span><strong>${paid.toFixed(2)}</strong><small>saldo aplicado</small></article>
          <article><span>Pagos registrados</span><strong>${collected.toFixed(2)}</strong><small>movimientos</small></article>
          <article><span>Saldo pendiente</span><strong>${Math.max(0,sales-paid).toFixed(2)}</strong><small>por cobrar</small></article>
        </div>

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
