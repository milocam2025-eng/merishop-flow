"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";

type Client = { id: string; name: string };
type Order = {
  id: string; product: string; cost: number; tax: number; commission_percent: number;
  shipping: number; total: number; paid: number; status: string; client_id: string | null;
};

export default function PedidosPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [rows, setRows] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    client_id: "", product: "", cost: "", tax: "0", commission: "20", shipping: "0", status: "Nuevo"
  });

  async function load() {
    const supabase = createClient();
    const [clientResult, orderResult] = await Promise.all([
      supabase.from("clients").select("id,name").order("name"),
      supabase.from("orders").select("*").order("created_at", { ascending: false })
    ]);
    setClients((clientResult.data as Client[]) ?? []);
    setRows((orderResult.data as Order[]) ?? []);
    if (orderResult.error) setMessage(orderResult.error.message);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cost = Number(form.cost);
    const tax = Number(form.tax || 0);
    const commission = Number(form.commission || 0);
    const shipping = Number(form.shipping || 0);
    const total = cost + tax + (cost * commission / 100) + shipping;

    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      client_id: form.client_id || null,
      product: form.product.trim(),
      cost, tax, commission_percent: commission, shipping, total, paid: 0, status: form.status
    });

    if (error) { setMessage(error.message); return; }
    setForm({ client_id: "", product: "", cost: "", tax: "0", commission: "20", shipping: "0", status: "Nuevo" });
    setMessage("Pedido creado correctamente.");
    load();
  }

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.name || "-";

  return (
    <AuthGuard>
      <AppShell title="Pedidos">
        <section className="panel">
          <h2>Nuevo pedido</h2>
          <form className="form-grid" onSubmit={submit}>
            <label>Cliente<select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}><option value="">Sin asignar</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Producto<input required value={form.product} onChange={e => setForm({ ...form, product: e.target.value })}/></label>
            <label>Costo USD<input type="number" step="0.01" required value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })}/></label>
            <label>Taxes<input type="number" step="0.01" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })}/></label>
            <label>Comisión %<input type="number" step="0.01" value={form.commission} onChange={e => setForm({ ...form, commission: e.target.value })}/></label>
            <label>Envío<input type="number" step="0.01" value={form.shipping} onChange={e => setForm({ ...form, shipping: e.target.value })}/></label>
            <label>Estado<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>Nuevo</option><option>Comprado</option><option>En almacén</option><option>Preparando envío</option><option>Completado</option></select></label>
            <button type="submit">Crear pedido</button>
          </form>
          <p className="message">{message}</p>
        </section>

        <section className="panel table-wrap">
          <table><thead><tr><th>Cliente</th><th>Producto</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}><td>{clientName(row.client_id)}</td><td>{row.product}</td><td>${Number(row.total).toFixed(2)}</td><td>${Number(row.paid).toFixed(2)}</td><td>${Math.max(0, Number(row.total)-Number(row.paid)).toFixed(2)}</td><td><StatusBadge value={row.status}/></td></tr>)}</tbody></table>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
