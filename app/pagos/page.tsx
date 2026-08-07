"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

type Order = { id: string; product: string; total: number; paid: number };
type Payment = { id: string; amount: number; method: string | null; order_id: string | null; created_at: string };

export default function PagosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [rows, setRows] = useState<Payment[]>([]);
  const [form, setForm] = useState({ order_id: "", amount: "", method: "Transferencia" });
  const [message, setMessage] = useState("");

  async function load() {
    const s = createClient();
    const [ordersResult, paymentResult] = await Promise.all([
      s.from("orders").select("id,product,total,paid").order("created_at", { ascending: false }),
      s.from("payments").select("*").order("created_at", { ascending: false })
    ]);
    setOrders((ordersResult.data as Order[]) ?? []);
    setRows((paymentResult.data as Payment[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;

    const amount = Number(form.amount);
    const { error } = await s.from("payments").insert({
      user_id: user.id, order_id: form.order_id || null, amount, method: form.method
    });

    if (error) { setMessage(error.message); return; }

    if (form.order_id) {
      const order = orders.find(o => o.id === form.order_id);
      if (order) {
        await s.from("orders").update({ paid: Number(order.paid || 0) + amount }).eq("id", form.order_id);
      }
    }

    setForm({ order_id: "", amount: "", method: "Transferencia" });
    setMessage("Pago registrado.");
    load();
  }

  return (
    <AuthGuard>
      <AppShell title="Pagos">
        <section className="panel">
          <h2>Registrar pago</h2>
          <form className="form-grid" onSubmit={submit}>
            <label>Pedido<select value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })}><option value="">Sin pedido</option>{orders.map(o => <option key={o.id} value={o.id}>{o.product} — saldo ${(Number(o.total)-Number(o.paid)).toFixed(2)}</option>)}</select></label>
            <label>Monto<input required type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}/></label>
            <label>Método<select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}><option>Transferencia</option><option>Zelle</option><option>Efectivo</option><option>Tarjeta</option><option>PayPal</option></select></label>
            <button type="submit">Registrar pago</button>
          </form>
          <p className="message">{message}</p>
        </section>

        <section className="panel table-wrap">
          <table><thead><tr><th>Fecha</th><th>Monto</th><th>Método</th></tr></thead>
          <tbody>{rows.map(p => <tr key={p.id}><td>{new Date(p.created_at).toLocaleDateString("es-MX")}</td><td>${Number(p.amount).toFixed(2)}</td><td>{p.method || "-"}</td></tr>)}</tbody></table>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
