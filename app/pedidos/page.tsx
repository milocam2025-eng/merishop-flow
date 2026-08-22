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
type Payment = {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  created_at: string;
};
export default function PedidosPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [rows, setRows] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [message, setMessage] = useState("");
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [paymentHistory, setPaymentHistory] =
    useState<Payment[]>([]);

  const [showPaymentForm, setShowPaymentForm] =
    useState(false);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Transferencia");

  const [form, setForm] = useState({
    client_id: "",
    product: "",
    cost: "",
    inventory_id: "",
    tax: "0",
    commission: "20",
    shipping: "0",
    status: "Nuevo",
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
  if (order.status === "Cancelado") {
    setMessage("Este pedido ya está cancelado.");
    return;
  }

  const isStoreOrder =
    order.source === "tienda";

  const confirmMessage =
    isStoreOrder
      ? "¿Cancelar este pedido de la tienda online?"
      : "¿Cancelar este pedido y devolver 1 unidad al inventario?";

  if (!confirm(confirmMessage)) {
    return;
  }

  const supabase = createClient();

  const { error: orderError } =
    await supabase
      .from("orders")
      .update({
        status: "Cancelado",
      })
      .eq("id", order.id);

  if (orderError) {
    setMessage(orderError.message);
    return;
  }

  if (isStoreOrder) {
    setMessage(
      "Pedido de tienda online cancelado correctamente."
    );

    load();
    return;
  }

  if (order.inventory_id) {
    const {
      data: item,
      error: inventoryReadError,
    } = await supabase
      .from("inventory")
      .select(
        "quantity,minimum_stock"
      )
      .eq(
        "id",
        order.inventory_id
      )
      .single();

    if (inventoryReadError) {
      setMessage(
        "El pedido se canceló, pero no se pudo leer el inventario: " +
          inventoryReadError.message
      );
      return;
    }

    const restoredQuantity =
      Number(item.quantity || 0) + 1;

    const minimumStock =
      Number(
        item.minimum_stock || 1
      );

    let restoredStatus =
      "Disponible";

    if (restoredQuantity <= 0) {
      restoredStatus =
        "Agotado";
    } else if (
      restoredQuantity <=
      minimumStock
    ) {
      restoredStatus =
        "Stock bajo";
    }

    const {
      error: inventoryUpdateError,
    } = await supabase
      .from("inventory")
      .update({
        quantity:
          restoredQuantity,
        status:
          restoredStatus,
      })
      .eq(
        "id",
        order.inventory_id
      );

    if (inventoryUpdateError) {
      setMessage(
        "El pedido se canceló, pero no se pudo restaurar el inventario: " +
          inventoryUpdateError.message
      );
      return;
    }
  }

  setMessage(
    "Pedido cancelado y unidad devuelta al inventario."
  );

  load();
}
async function confirmOrder(order: Order) {
  if (order.status === "Confirmado") {
    setMessage("Este pedido ya está confirmado.");
    return;
  }

  if (order.status === "Cancelado") {
    setMessage("No se puede confirmar un pedido cancelado.");
    return;
  }

  const ok = confirm(
    `¿Confirmar el pedido ${order.order_number || ""}?`
  );

  if (!ok) return;

  const supabase = createClient();

  const { error } = await supabase
    .from("orders")
    .update({
      status: "Confirmado",
    })
    .eq("id", order.id);

  if (error) {
    setMessage(
      "No se pudo confirmar el pedido: " +
        error.message
    );
    return;
  }

  setMessage("Pedido confirmado correctamente.");

  setSelectedOrder({
    ...order,
    status: "Confirmado",
  });

  load();
}

function contactCustomer(order: Order) {
  const phone = String(
    order.customer_phone || ""
  ).replace(/\D/g, "");

  if (!phone) {
    alert(
      "Este pedido no tiene número de WhatsApp."
    );
    return;
  }

  const message = [
    "Hola",
    order.customer_name
      ? ` ${order.customer_name},`
      : ",",
    "",
    "Te contactamos de MeriShop.",
    "",
    order.order_number
      ? `Pedido: ${order.order_number}`
      : "",
    "",
    "Tu pedido fue recibido. Estamos confirmando disponibilidad, pago y entrega.",
  ]
    .filter(Boolean)
    .join("\n");

  const url =
    `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(
      message
    )}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}
async function registerPayment(order: Order) {
  if (order.status === "Cancelado") {
    setMessage(
      "No se puede registrar un pago en un pedido cancelado."
    );
    return;
  }

  const totalOrder = Number(
    order.total_mxn ??
      order.total ??
      0
  );

  const alreadyPaid = Number(
    order.paid ?? 0
  );

  const remaining = Math.max(
    0,
    totalOrder - alreadyPaid
  );

  if (remaining <= 0) {
    setMessage(
      "Este pedido ya está pagado."
    );
    return;
  }

  const value = prompt(
    `Saldo pendiente: $${remaining.toLocaleString(
      "es-MX",
      {
        minimumFractionDigits: 2,
      }
    )} MXN\n\nEscribe el monto recibido:`
  );

  if (value === null) return;

  const amount = Number(
    value.replace(/,/g, "")
  );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    alert(
      "Escribe un monto válido."
    );
    return;
  }

  if (amount > remaining) {
    alert(
      "El pago no puede ser mayor al saldo pendiente."
    );
    return;
  }

  const methodInput = prompt(
    "Método de pago:\n\n" +
      "1. Transferencia\n" +
      "2. Efectivo\n" +
      "3. Tarjeta\n" +
      "4. Depósito\n" +
      "5. Otro\n\n" +
      "Escribe el número:"
  );

  if (methodInput === null) return;

  const methods: Record<string, string> = {
    "1": "Transferencia",
    "2": "Efectivo",
    "3": "Tarjeta",
    "4": "Depósito",
    "5": "Otro",
  };

  const method =
    methods[methodInput.trim()];

  if (!method) {
    alert(
      "Selecciona un método de pago válido."
    );
    return;
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setMessage(
      "Tu sesión terminó. Inicia sesión nuevamente."
    );
    return;
  }

  // 1. Guardar movimiento en payments
  const {
    data: payment,
    error: paymentError,
  } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      order_id: order.id,
      amount,
      method,
    })
    .select("id")
    .single();

  if (paymentError) {
    setMessage(
      "No se pudo guardar el pago: " +
        paymentError.message
    );
    return;
  }

  const newPaid =
    alreadyPaid + amount;

  const newStatus =
    newPaid >= totalOrder
      ? "Pagado"
      : order.status;

  // 2. Actualizar total pagado del pedido
  const { error: orderError } =
    await supabase
      .from("orders")
      .update({
        paid: newPaid,
        status: newStatus,
      })
      .eq("id", order.id);

  if (orderError) {
    // Si falla orders, eliminamos
    // el movimiento recién creado.
    if (payment?.id) {
      await supabase
        .from("payments")
        .delete()
        .eq("id", payment.id);
    }

    setMessage(
      "No se pudo actualizar el pedido: " +
        orderError.message
    );
    return;
  }

  setSelectedOrder({
    ...order,
    paid: newPaid,
    status: newStatus,
  });
await loadPayments(order.id);
  setMessage(
    newStatus === "Pagado"
      ? "Pago registrado. Pedido pagado completamente."
      : `Pago de $${amount.toLocaleString(
          "es-MX",
          {
            minimumFractionDigits: 2,
          }
        )} registrado por ${method}.`
  );

  load();
}
async function loadPayments(orderId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("payments")
    .select("id, order_id, amount, method, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Error cargando historial de pagos:",
      error
    );

    setPaymentHistory([]);
    return;
  }

  setPaymentHistory(
    (data || []) as Payment[]
  );
}
const clientName = (id: string | null) =>
  clients.find((c) => c.id === id)?.name || "-";
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
    <>
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
            clientName(row.client_id) ||
            "-"}
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
          ${Number(
            row.paid ?? 0
          ).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
          })}
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
                  Number(
                    row.paid ?? 0
                  )
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
          <StatusBadge
            value={row.status}
          />
        </td>

        <td>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
           <button
  type="button"
  onClick={async () => {
    if (selectedOrder?.id === row.id) {
      setSelectedOrder(null);
      setPaymentHistory([]);
      return;
    }

    setSelectedOrder(row);
    await loadPayments(row.id);
  }}
>
  {selectedOrder?.id === row.id
    ? "Cerrar"
    : "Ver detalle"}
</button>
            {row.status !==
              "Cancelado" &&
            row.status !==
              "Pagado" ? (
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
              <span>
                {row.status}
              </span>
            )}
          </div>
        </td>
      </tr>

      {selectedOrder?.id ===
        row.id && (
        <tr>
          <td
            colSpan={9}
            style={{
              background:
                "#f8fafc",
              padding: 0,
            }}
          >
            <div
              style={{
                padding: 24,
                borderTop:
                  "1px solid #e2e8f0",
                borderBottom:
                  "1px solid #e2e8f0",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: 18,
                }}
              >
                Detalle del pedido
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 14,
                  marginBottom: 22,
                }}
              >
                <div>
                  <strong>
                    Pedido
                  </strong>
                  <div>
                    {row.order_number ||
                      "-"}
                  </div>
                </div>

                <div>
                  <strong>
                    Origen
                  </strong>
                  <div>
                    {row.source ===
                    "tienda"
                      ? "Tienda online"
                      : "Administración"}
                  </div>
                </div>

                <div>
                  <strong>
                    Cliente
                  </strong>
                  <div>
                    {row.customer_name ||
                      clientName(
                        row.client_id
                      ) ||
                      "-"}
                  </div>
                </div>

                <div>
                  <strong>
                    WhatsApp
                  </strong>
                  <div>
                    {row.customer_phone ||
                      "-"}
                  </div>
                </div>

                <div>
                  <strong>
                    Estado
                  </strong>
                  <div>
                    {row.status}
                  </div>
                </div>
              </div>

              {row.items &&
              row.items.length >
                0 ? (
                <>
                  <h3>
                    Productos
                  </h3>

                  {row.items.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.inventory_id ||
                          index
                        }
                        style={{
                          padding:
                            "14px 0",
                          borderBottom:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <strong>
                          {
                            item.product
                          }
                        </strong>

                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          {item.brand && (
                            <div>
                              Marca:{" "}
                              {
                                item.brand
                              }
                            </div>
                          )}

                          {item.size && (
                            <div>
                              Talla:{" "}
                              {
                                item.size
                              }
                            </div>
                          )}

                          {item.color && (
                            <div>
                              Color:{" "}
                              {
                                item.color
                              }
                            </div>
                          )}

                          <div>
                            Cantidad:{" "}
                            {
                              item.quantity
                            }
                          </div>

                          <div>
                            Precio: $
                            {Number(
                              item.price
                            ).toLocaleString(
                              "es-MX",
                              {
                                minimumFractionDigits: 2,
                              }
                            )}{" "}
                            MXN
                          </div>

                          <div>
                            Subtotal: $
                            {Number(
                              item.subtotal
                            ).toLocaleString(
                              "es-MX",
                              {
                                minimumFractionDigits: 2,
                              }
                            )}{" "}
                            MXN
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </>
              ) : (
                <p>
                  <strong>
                    Producto:
                  </strong>{" "}
                  {row.product}
                </p>
              )}

              <div
                style={{
                  marginTop: 22,
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                Total: $
                {Number(
                  row.total_mxn ??
                    row.total ??
                    0
                ).toLocaleString(
                  "es-MX",
                  {
                    minimumFractionDigits: 2,
                  }
                )}
                {row.source ===
                "tienda"
                  ? " MXN"
                  : ""}
              </div>
<div
  style={{
    marginTop: 26,
    paddingTop: 22,
    borderTop: "1px solid #e2e8f0",
  }}
>
  <h3 style={{ marginTop: 0 }}>
    Historial de pagos
  </h3>

  {paymentHistory.length === 0 ? (
    <p
      style={{
        color: "#64748b",
      }}
    >
      No hay movimientos registrados
      en el historial.
    </p>
  ) : (
    <div
      style={{
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "10px 8px",
              }}
            >
              Fecha
            </th>

            <th
              style={{
                textAlign: "left",
                padding: "10px 8px",
              }}
            >
              Método
            </th>

            <th
              style={{
                textAlign: "right",
                padding: "10px 8px",
              }}
            >
              Monto
            </th>
          </tr>
        </thead>

        <tbody>
          {paymentHistory.map(
            (payment) => (
              <tr key={payment.id}>
                <td
                  style={{
                    padding: "10px 8px",
                    borderTop:
                      "1px solid #e2e8f0",
                  }}
                >
                  {new Date(
                    payment.created_at
                  ).toLocaleString(
                    "es-MX",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }
                  )}
                </td>

                <td
                  style={{
                    padding: "10px 8px",
                    borderTop:
                      "1px solid #e2e8f0",
                  }}
                >
                  {payment.method}
                </td>

                <td
                  style={{
                    padding: "10px 8px",
                    borderTop:
                      "1px solid #e2e8f0",
                    textAlign: "right",
                    fontWeight: 700,
                  }}
                >
                  $
                  {Number(
                    payment.amount
                  ).toLocaleString(
                    "es-MX",
                    {
                      minimumFractionDigits: 2,
                    }
                  )}{" "}
                  MXN
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )}

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
      marginTop: 18,
      padding: 16,
      background: "#ffffff",
      borderRadius: 10,
    }}
  >
    <div>
      <strong>Pagado acumulado</strong>
      <div>
        $
        {Number(
          row.paid ?? 0
        ).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}{" "}
        MXN
      </div>
    </div>

    <div>
      <strong>Saldo pendiente</strong>
      <div>
        $
        {Math.max(
          0,
          Number(
            row.total_mxn ??
              row.total ??
              0
          ) -
            Number(row.paid ?? 0)
        ).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}{" "}
        MXN
      </div>
    </div>
  </div>
</div>
<div
  style={{
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 24,
  }}
>
  {row.status === "Pendiente" && (
    <button
      type="button"
      onClick={() =>
        confirmOrder(row)
      }
      style={{
        border: "none",
        borderRadius: 10,
        padding: "12px 18px",
        background: "#16a34a",
        color: "#ffffff",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      Confirmar pedido
    </button>
  )}

  {row.customer_phone && (
    <button
      type="button"
      onClick={() =>
        contactCustomer(row)
      }
      style={{
        border: "none",
        borderRadius: 10,
        padding: "12px 18px",
        background: "#25D366",
        color: "#ffffff",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      WhatsApp al cliente
    </button>
  )}
{row.status !== "Cancelado" &&
  row.status !== "Pagado" && (
    <button
      type="button"
      onClick={() =>
        setShowPaymentForm(
          !showPaymentForm
        )
      }
      style={{
        border: "none",
        borderRadius: 10,
        padding: "12px 18px",
        background: "#2563eb",
        color: "#ffffff",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {showPaymentForm
        ? "Cerrar pago"
        : "Registrar pago"}
    </button>
 
  )}
</div>

{showPaymentForm &&
  selectedOrder?.id === row.id && (
    <div
      style={{
        marginTop: 20,
        padding: 20,
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        maxWidth: 520,
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: 18,
        }}
      >
        Registrar nuevo pago
      </h3>

      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        <label>
          <strong>Monto</strong>

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(e) =>
              setPaymentAmount(
                e.target.value
              )
            }
            placeholder="0.00"
            style={{
              width: "100%",
              marginTop: 6,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 16,
            }}
          />
        </label>

        <label>
          <strong>Método de pago</strong>

          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(
                e.target.value
              )
            }
            style={{
              width: "100%",
              marginTop: 6,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 16,
            }}
          >
            <option>Transferencia</option>
            <option>Depósito</option>
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Otro</option>
          </select>
        </label>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() =>
              registerPayment(row)
            }
            style={{
              border: "none",
              borderRadius: 9,
              padding: "12px 18px",
              background: "#16a34a",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Guardar pago
          </button>

          <button
            type="button"
            onClick={() => {
              setShowPaymentForm(false);
              setPaymentAmount("");
              setPaymentMethod("Transferencia");
            }}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 9,
              padding: "12px 18px",
              background: "#ffffff",
              color: "#172b4d",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )}

            </div>
          </td>        
        </tr>
      )}
    </>
  ))}
</tbody>
</table>          
 
      </section>
    </AppShell>
  </AuthGuard>
);
}
