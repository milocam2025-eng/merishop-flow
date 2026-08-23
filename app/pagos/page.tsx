"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  product: string;
  total: number;
  paid: number;
  status: string;
  order_number?: string | null;
  customer_name?: string | null;
};

type Payment = { id: string; amount: number; method: string | null; order_id: string | null; created_at: string };

export default function PagosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [rows, setRows] = useState<Payment[]>([]);
  const [form, setForm] = useState({ order_id: "", amount: "", method: "Transferencia" });
  const [message, setMessage] = useState("");

  async function load() {
    const s = createClient();
    const [ordersResult, paymentResult] = await Promise.all([
    s.from("orders")
  .select("id,product,total,paid,status,order_number,customer_name")
  .order("created_at", { ascending: false }),
      s.from("payments").select("*").order("created_at", { ascending: false })
    ]);
 if (ordersResult.error) {
  console.log("ERROR ORDERS DETALLE:", {
    message: ordersResult.error.message,
    details: ordersResult.error.details,
    hint: ordersResult.error.hint,
    code: ordersResult.error.code,
  });

  setMessage(
    "Error cargando pedidos: " + ordersResult.error.message
  );
}
 const data = (ordersResult.data as Order[]) ?? [];

console.log(data);

setOrders(data);
    setRows((paymentResult.data as Payment[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const s = createClient();
const {
  data: { user },
} = await s.auth.getUser();

console.log("Usuario en pagos:", user);

if (!user) {
  setMessage("No hay una sesión activa.");
  return;
}
   
    const amount = Number(form.amount);
const order = orders.find(
  (o) => o.id === form.order_id
);

if (!order) {
  setMessage("Selecciona un pedido.");
  return;
}

const balance =
  Number(order.total || 0) -
  Number(order.paid || 0);

if (amount <= 0) {
  setMessage("El monto debe ser mayor a $0.");
  return;
}

if (amount > balance) {
  setMessage(
    `El pago excede el saldo pendiente de $${balance.toFixed(2)}.`
  );
  return;
}
    const { error } = await s.from("payments").insert({
      user_id: user.id, order_id: form.order_id || null, amount, method: form.method
    });

    if (error) { setMessage(error.message); return; }

  
if (form.order_id) {
  const order = orders.find((o) => o.id === form.order_id);

  if (order) {
    const newPaid = Number(order.paid || 0) + amount;
    const total = Number(order.total || 0);

    let newStatus = order.status || "Nuevo";

    if (newPaid <= 0) {
      newStatus = "Nuevo";
    } else if (newPaid < total) {
      newStatus = "Apartado";
    } else if (newPaid >= total) {
      newStatus = "Pagado";
    }

    const { error: updateError } = await s
      .from("orders")
      .update({
        paid: newPaid,
        status: newStatus,
      })
      .eq("id", form.order_id);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }
  }
}

    setForm({ order_id: "", amount: "", method: "Transferencia" });
    setMessage("Pago registrado.");
    load();
  }
const pendingOrders = orders.filter((order) => {
  const balance =
    Number(order.total || 0) - Number(order.paid || 0);

  return balance > 0 && order.status !== "Cancelado";
});
const selectedOrder = orders.find(
  (order) => order.id === form.order_id
);

const selectedBalance = selectedOrder
  ? Math.max(
      0,
      Number(selectedOrder.total || 0) -
        Number(selectedOrder.paid || 0)
    )
  : 0;

console.log("PEDIDOS PENDIENTES:", pendingOrders);
  return (
    <AuthGuard>
      <AppShell title="Pagos">
        <section className="panel">
          <h2>Registrar pago</h2>
          <form className="form-grid" onSubmit={submit}>
           <label>
  Pedido
  <select
    value={form.order_id}
    onChange={(e) =>
      setForm({ ...form, order_id: e.target.value })
    }
  >
    <option value="">Seleccionar pedido</option>

    {pendingOrders.map((o) => (
      <option key={o.id} value={o.id}>
  {o.order_number || "Pedido"} —{" "}
  {o.customer_name || "Cliente"} —{" "}
  {o.product} — saldo $
  {(Number(o.total) - Number(o.paid)).toFixed(2)}
</option>
    ))}
  </select>
</label>
{selectedOrder && (
  <div
    style={{
      gridColumn: "1 / -1",
      padding: 18,
      border: "1px solid #dbe4ef",
      borderRadius: 12,
      background: "#f8fafc",
    }}
  >
    <strong>Pedido seleccionado</strong>

    <div style={{ marginTop: 12 }}>
      <div>
        <strong>Producto:</strong> {selectedOrder.product}
      </div>
      <div>
        <strong>Total:</strong> $
        {Number(selectedOrder.total || 0).toFixed(2)}
      </div>
      <div>
        <strong>Pagado:</strong> $
        {Number(selectedOrder.paid || 0).toFixed(2)}
      </div>
      <div>
        <strong>Saldo pendiente:</strong> $
        {selectedBalance.toFixed(2)}
      </div>
      <div>
        <strong>Estado:</strong> {selectedOrder.status}
      </div>
    </div>
  </div>
)}

            <label>Monto<input required type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}/></label>
            <label>Método<select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}><option>Transferencia</option><option>Zelle</option><option>Efectivo</option><option>Tarjeta</option><option>PayPal</option></select></label>
            <button type="submit">Registrar pago</button>
          </form>
          <p className="message">{message}</p>
        </section>

        <section className="panel table-wrap">
         <table>
  <thead>
    <tr>
      <th>Fecha</th>
      <th>Pedido</th>
      <th>Cliente</th>
      <th>Monto</th>
      <th>Método</th>
    </tr>
  </thead>

  <tbody>
    {rows.map((p) => {
      const order = orders.find(
        (o) => o.id === p.order_id
      );

      return (
        <tr key={p.id}>
          <td>
            {new Date(
              p.created_at
            ).toLocaleDateString("es-MX")}
          </td>

          <td>
            {order?.order_number || "-"}
          </td>

          <td>
            {order?.customer_name || "-"}
          </td>

          <td>
            ${Number(p.amount).toFixed(2)}
          </td>

          <td>
            {p.method || "-"}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
