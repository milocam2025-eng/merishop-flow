"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  client_id: string | null;
  product: string;
  total: number;
  paid: number;
  status: string;
}

type Client = { id: string; name: string };
type Shipment = {
  id: string;
  order_id: string | null;
  client_id: string | null;
  carrier: string | null;
  tracking: string | null;
  status: string;
};

export default function EnviosPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rows, setRows] = useState<Shipment[]>([]);
  const [form, setForm] = useState({ order_id: "", client_id: "", carrier: "USPS", tracking: "", status: "Preparando" });
  const [message, setMessage] = useState("");

 async function load() {
  const s = createClient();

  const [clientsResult, ordersResult, shipmentsResult] =
    await Promise.all([
      s.from("clients")
        .select("id,name")
        .order("name"),

      s.from("orders")
        .select("id,client_id,product,total,paid,status")
        .order("created_at", { ascending: false }),

      s.from("shipments")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  setClients((clientsResult.data as Client[]) ?? []);
  setOrders((ordersResult.data as Order[]) ?? []);
  setRows((shipmentsResult.data as Shipment[]) ?? []);
}
    
   useEffect(() => { load(); }, []);

 async function submit(e: FormEvent) {
  e.preventDefault();

  const s = createClient();

  // Buscar el pedido seleccionado
  const order = paidOrders.find(
    o => o.id === form.order_id
  );

  if (!order) {
    setMessage("Selecciona un pedido.");
    return;
  }

  const { error } = await s
    .from("shipments")
    .insert({
      order_id: order.id,
      client_id: order.client_id,
      carrier: form.carrier,
      tracking: form.tracking,
      status: form.status,
    });

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage("Envío guardado.");

  setForm({
    order_id: "",
    client_id: "",
    carrier: "USPS",
    tracking: "",
    status: "Preparando",
  });

  load();
}
   
  const name = (id: string | null) => clients.find(c => c.id === id)?.name || "-";
const paidOrders = orders.filter((order) => {
  return (
    order.status === "Pagado" &&
    Number(order.paid || 0) >= Number(order.total || 0)
  );
});
  return (
    <AuthGuard>
      <AppShell title="Envíos">
        <section className="panel">
          <h2>Nuevo envío</h2>
          <form className="form-grid" onSubmit={submit}>
          <label>
  Pedido pagado
  <select
    value={form.order_id}
    onChange={(e) =>
      setForm({
        ...form,
        order_id: e.target.value,
      })
    }
  >
    <option value="">
      Seleccionar pedido pagado
    </option>

    {paidOrders.map((o) => (
      <option key={o.id} value={o.id}>
        {o.product} — Pagado $
        {Number(o.total || 0).toFixed(2)}
      </option>
    ))}
  </select>
</label>
            <label>Paquetería<select value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })}><option>USPS</option><option>UPS</option><option>FedEx</option><option>DHL</option></select></label>
            <label>Rastreo<input value={form.tracking} onChange={e => setForm({ ...form, tracking: e.target.value })}/></label>
            <label>Estado<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>Preparando</option><option>Enviado</option><option>En tránsito</option><option>Entregado</option></select></label>
            <button type="submit">Guardar envío</button>
          </form>
          <p className="message">{message}</p>
        </section>

        <section className="panel table-wrap">
          <table><thead><tr><th>Cliente</th><th>Paquetería</th><th>Rastreo</th><th>Estado</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}><td>{name(r.client_id)}</td><td>{r.carrier || "-"}</td><td>{r.tracking || "-"}</td><td><StatusBadge value={r.status}/></td></tr>)}</tbody></table>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
