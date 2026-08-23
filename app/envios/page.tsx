"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  client_id: string | null;
  product: string;
  total: number;
  paid: number;
  status: string;
  order_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
};

type Client = { id: string; name: string };
type Shipment = {
  id: string;
  order_id: string | null;
  client_id: string | null;
  carrier: string | null;
  tracking: string | null;
  status: string;
  delivered_at: string | null;

  orders?: {
    order_number?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    client_id?: string | null;
    product?: string | null;
  } | null;
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
        .select("id,client_id,product,total,paid,status,order_number,customer_name,customer_phone,total_mxn")
        .order("created_at", { ascending: false }),

      s.from("shipments")
        .select(`
          *,
          orders (
            order_number,
            customer_name,
            customer_phone,
            client_id,
            product
          )
        `)
        .order("created_at", { ascending: false }),
    ]);

  setClients(
    (clientsResult.data as Client[]) ?? []
  );

  setOrders(
    (ordersResult.data as Order[]) ?? []
  );

  setRows(
    (shipmentsResult.data as Shipment[]) ?? []
  );
}    
   useEffect(() => { load(); }, []);

async function submit(e: FormEvent) {
  e.preventDefault();

  const s = createClient();

  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) {
    setMessage(
      "Tu sesión terminó. Inicia sesión nuevamente."
    );
    return;
  }

  // Buscar el pedido seleccionado
  const order = paidOrders.find(
    (o) => o.id === form.order_id
  );

  if (!order) {
    setMessage(
      "Selecciona un pedido pagado."
    );
    return;
  }

  const { error } = await s
    .from("shipments")
    .insert({
      user_id: user.id,
      order_id: order.id,
      client_id: order.client_id,
      carrier: form.carrier,
      tracking:
        form.tracking.trim() || null,
      status: form.status,
    });

  if (error) {
    setMessage(
      "No se pudo guardar el envío: " +
        error.message
    );
    return;
  }

  setMessage(
    "Envío guardado correctamente."
  );

  setForm({
    order_id: "",
    client_id: "",
    carrier: "USPS",
    tracking: "",
    status: "Preparando",
  });

  load();
}   
async function updateShipmentStatus(
  id: string,
  newStatus: string
) {
  const s = createClient();

  const deliveredAt =
    newStatus === "Entregado"
      ? new Date().toISOString()
      : null;

  const { error } = await s
    .from("shipments")
    .update({
      status: newStatus,
      delivered_at: deliveredAt,
    })
    .eq("id", id);

  if (error) {
    setMessage(
      "Error al actualizar el envío: " +
        error.message
    );
    return;
  }

  setRows((current) =>
  current.map((row) =>
    row.id === id
      ? {
          ...row,
          status: newStatus,
          delivered_at: deliveredAt,
        }
      : row
  )
);
  setMessage(
    newStatus === "Entregado"
      ? "Envío marcado como entregado."
      : "Estado del envío actualizado."
  );
}
  const name = (id: string | null) => clients.find(c => c.id === id)?.name || "-";
const shipmentClientName = (
  shipment: Shipment
) => {
  if (shipment.orders?.customer_name) {
    return shipment.orders.customer_name;
  }

  const clientId =
    shipment.client_id ||
    shipment.orders?.client_id ||
    null;

  return name(clientId);
};
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
    {o.order_number || "Pedido"} —{" "}
    {o.customer_name ||
      name(o.client_id)}{" "}
    — {o.product} — $
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
<table>
  <thead>
    <tr>
      <th>Pedido</th>
      <th>Cliente</th>
      <th>Producto</th>
      <th>Paquetería</th>
      <th>Rastreo</th>
      <th>Estado</th>
      <th>Fecha entrega</th>
    </tr>
  </thead>          
<tbody>
  {rows.map((r) => (
    <tr key={r.id}>
      <td>
        {r.orders?.order_number || "-"}
      </td>

      <td>
        {shipmentClientName(r)}
      </td>

      <td>
        {r.orders?.product || "-"}
      </td>

      <td>
        {r.carrier || "-"}
      </td>

      <td>
        {r.tracking || "-"}
      </td>

<td>
  <select
    value={r.status}
    onChange={(e) =>
      updateShipmentStatus(
        r.id,
        e.target.value
      )
    }
  >
    <option value="Preparando">
      Preparando
    </option>

    <option value="Enviado">
      Enviado
    </option>

    <option value="En tránsito">
      En tránsito
    </option>

    <option value="Entregado">
      Entregado
    </option>
  </select>
</td>
      <td>
  {r.delivered_at
    ? new Date(r.delivered_at).toLocaleString(
        "es-MX",
        {
          dateStyle: "short",
          timeStyle: "short",
        }
      )
    : "-"}
</td>

    </tr>
  ))}
</tbody>   
</table>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
