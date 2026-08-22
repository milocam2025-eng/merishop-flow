"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";

type Client = { id: string; name: string };
type Inventory = {
  id: string;
  product: string;
  quantity: number;
  minimum_stock: number | null;
  cost_usd: number | null;
  tax_usd: number | null;
  shipping_usd: number | null;
};
type Order = {
  id: string;
  product: string;
  cost: number;
  tax: number;
  commission_percent: number;
  shipping: number;
  total: number;
  paid: number;
  status: string;
  client_id: string | null;
  inventory_id: string | null;

  order_number?: string | null;
  source?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_mxn?: number | null;
  created_at?: string | null;

  items?: {
    inventory_id?: string;
    product: string;
    brand?: string | null;
    size?: string | null;
    color?: string | null;
    quantity: number;
    price: number;
    subtotal: number;
  }[] | null;
};

export default function PedidosPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [rows, setRows] = useState<Order[]>([]);
const [inventory, setInventory] = useState<Inventory[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    client_id: "", product: "", cost: "", inventory_id: "", tax: "0", commission: "20", shipping: "0", status: "Nuevo"
  });

  async function load() {
    const supabase = createClient();
    const [clientResult, inventoryResult, orderResult] =
await Promise.all([
      supabase.from("clients").select("id,name").order("name"),
supabase
    .from("inventory")
    .select("id,product,quantity,minimum_stock,cost_usd,tax_usd,shipping_usd")
    .order("product"),
      supabase.from("orders").select("*").order("created_at", { ascending: false })
    ]);
setInventory((inventoryResult.data as Inventory[]) ?? []);
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

   const selectedItem = inventory.find(
  (item) => item.id === form.inventory_id
);

if (!selectedItem) {
  setMessage("Selecciona un producto del inventario.");
  return;
}

if (Number(selectedItem.quantity || 0) <= 0) {
  setMessage("Este producto ya no tiene existencias.");
  return;
}

const { error } = await supabase.from("orders").insert({
  user_id: user.id,
  client_id: form.client_id || null,
  inventory_id: selectedItem.id,
  product: selectedItem.product,
  cost,
  tax,
  commission_percent: commission,
  shipping,
  total,
  paid: 0,
  status: form.status
});

if (error) {
  setMessage(error.message);
  return;
}
const newQuantity = Number(selectedItem.quantity || 0) - 1;

let newStatus = "Disponible";

if (newQuantity <= 0) {
  newStatus = "Agotado";
} else if (
  newQuantity <= Number(selectedItem.minimum_stock || 1)
) {
  newStatus = "Stock bajo";
}

const { error: inventoryError } = await supabase
  .from("inventory")
  .update({
    quantity: newQuantity,
    status: newStatus,
  })
  .eq("id", selectedItem.id);
if (inventoryError) {
  setMessage(
    "El pedido se creó, pero no se pudo actualizar el inventario: " +
      inventoryError.message
  );
  return;
}
  setForm({
  client_id: "",
  inventory_id: "",
  product: "",
  cost: "",
  tax: "0",
  commission: "20",
  shipping: "0",
  status: "Nuevo"
});
    setMessage("Pedido creado correctamente.");
    load();
  }

async function cancelOrder(order: Order) {
  if (!confirm("¿Cancelar este pedido y devolver 1 unidad al inventario?")) {
    return;
  }

  const supabase = createClient();

  if (order.status === "Cancelado") {
    setMessage("Este pedido ya está cancelado.");
    return;
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: "Cancelado" })
    .eq("id", order.id);

  if (orderError) {
    setMessage(orderError.message);
    return;
  }

  if (order.inventory_id) {
    const { data: item, error: inventoryReadError } = await supabase
      .from("inventory")
      .select("quantity,minimum_stock")
      .eq("id", order.inventory_id)
      .single();

    if (inventoryReadError) {
      setMessage(
        "El pedido se canceló, pero no se pudo leer el inventario: " +
          inventoryReadError.message
      );
      return;
    }

    const restoredQuantity = Number(item.quantity || 0) + 1;
    const minimumStock = Number(item.minimum_stock || 1);

    let restoredStatus = "Disponible";

    if (restoredQuantity <= 0) {
      restoredStatus = "Agotado";
    } else if (restoredQuantity <= minimumStock) {
      restoredStatus = "Stock bajo";
    }

    const { error: inventoryUpdateError } = await supabase
      .from("inventory")
      .update({
        quantity: restoredQuantity,
        status: restoredStatus,
      })
      .eq("id", order.inventory_id);

    if (inventoryUpdateError) {
      setMessage(inventoryUpdateError.message);
      return;
    }
  }

  setMessage("Pedido cancelado y unidad devuelta al inventario.");
  load();
}

const clientName = (id: string | null) =>
  clients.find(c => c.id === id)?.name || "-";
  
  return (
    <AuthGuard>
      <AppShell title="Pedidos">
        <section className="panel">
          <h2>Nuevo pedido</h2>
          <form className="form-grid" onSubmit={submit}>
            <label>Cliente<select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}><option value="">Sin asignar</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>
  Producto
  <select
    required
    value={form.inventory_id}
onChange={(e) => {
  const selectedId = e.target.value;

  const selectedProduct = inventory.find(
    (item) => item.id === selectedId
  );

  setForm({
    ...form,
    inventory_id: selectedId,
    product: selectedProduct?.product || "",
    cost: String(selectedProduct?.cost_usd ?? 0),
    tax: String(selectedProduct?.tax_usd ?? 0),
    shipping: String(selectedProduct?.shipping_usd ?? 0),
  });
}}    
  >
    <option value="">Seleccionar producto</option>

    {inventory.map((item) => (
      <option
        key={item.id}
        value={item.id}
        disabled={Number(item.quantity || 0) <= 0}
      >
        {item.product} · Stock: {item.quantity}
      </option>
    ))}
  </select>
</label>
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
<table>
  <thead>
    <tr>
      <th>Pedido</th>
      <th>Origen</th>
      <th>Cliente</th>
      <th>Producto</th>
      <th>Total</th>
      <th>Pagado</th>
      <th>Saldo</th>
      <th>Estado</th>
      <th>Acciones</th>
    </tr>
  </thead>
<tbody>
  {rows.map((row) => (
    <tr key={row.id}>
      <td>
        {row.order_number || "-"}
      </td>

      <td>
        {row.source === "tienda"
          ? "Tienda online"
          : "Administración"}
      </td>

      <td>
        {row.customer_name ||
          clientName(row.client_id)}
      </td>

      <td>
        {row.product}
      </td>

      <td>
        {row.source === "tienda"
          ? `$${Number(
              row.total_mxn ?? row.total ?? 0
            ).toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })} MXN`
          : `$${Number(
              row.total ?? 0
            ).toFixed(2)}`}
      </td>

      <td>
        ${Number(row.paid ?? 0).toFixed(2)}
      </td>

      <td>
        {row.source === "tienda"
          ? `$${Math.max(
              0,
              Number(
                row.total_mxn ??
                  row.total ??
                  0
              ) -
                Number(row.paid ?? 0)
            ).toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })} MXN`
          : `$${Math.max(
              0,
              Number(row.total ?? 0) -
                Number(row.paid ?? 0)
            ).toFixed(2)}`}
      </td>

      <td>
        <StatusBadge value={row.status} />
      </td>

      <td>
        {row.status !== "Cancelado" &&
        row.status !== "Pagado" ? (
          <button
            type="button"
            className="danger"
            onClick={() =>
              cancelOrder(row)
            }
          >
            Cancelar
          </button>
        ) : (
          <span>{row.status}</span>
        )}
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
