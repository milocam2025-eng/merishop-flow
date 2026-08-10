"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  notes: string | null;

  customer_code?: string | null;
  status?: string | null;
  birthday?: string | null;
  preferred_contact?: string | null;

  total_purchases?: number | null;
  total_paid?: number | null;
  balance_due?: number | null;
  last_purchase_at?: string | null;
};
type Order = {
  id: string;
  product: string;
  total: number;
  paid: number;
  status: string;
  client_id: string | null;
  created_at: string;
};
export default function ClientePage() {

  const params = useParams();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
const totalComprado = orders.reduce(
  (sum, order) => sum + Number(order.total || 0),
  0
);

const totalPagado = orders.reduce(
  (sum, order) => sum + Number(order.paid || 0),
  0
);

const saldoPendiente = totalComprado - totalPagado;

const ultimaCompra =
  orders.length > 0 
  ? new Date(orders[0].created_at).toLocaleDateString("es-MX")
  : "-";

  async function loadClient() {
  const supabase = createClient();

  const [clientResult, ordersResult] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("id", params.id)
      .single(),

    supabase
      .from("orders")
      .select("id,product,total,paid,status,client_id,created_at")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!clientResult.error) {
    setClient(clientResult.data as Client);
  }

  if (!ordersResult.error) {
    setOrders((ordersResult.data as Order[]) ?? []);
  }

  setLoading(false);
}

  useEffect(() => {
    loadClient();
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <AppShell>
          <p>Cargando cliente...</p>
        </AppShell>
      </AuthGuard>
    );
  }

  if (!client) {
    return (
      <AuthGuard>
        <AppShell>
          <p>Cliente no encontrado.</p>
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AppShell>

        <button
          className="secondary"
          onClick={() => router.push("/clientes")}
        >
          ← Volver
        </button>

        <section className="panel">

          <h1>{client.name}</h1>

          <br/>

          <table>
            <tbody>

              <tr>
                <td><strong>Código</strong></td>
                <td>{client.customer_code ?? "-"}</td>
              </tr>

              <tr>
                <td><strong>WhatsApp</strong></td>
                <td>{client.phone ?? "-"}</td>
              </tr>

              <tr>
                <td><strong>Correo</strong></td>
                <td>{client.email ?? "-"}</td>
              </tr>

              <tr>
                <td><strong>Ubicación</strong></td>
                <td>{client.location ?? "-"}</td>
              </tr>

              <tr>
                <td><strong>Cumpleaños</strong></td>
                <td>{client.birthday ?? "-"}</td>
              </tr>

              <tr>
                <td><strong>Contacto preferido</strong></td>
                <td>{client.preferred_contact ?? "-"}</td>
              </tr>

              <tr>
                <td><strong>Estado</strong></td>
                <td>{client.status ?? "-"}</td>
              </tr>

             
<tr>
  <td><strong>Total comprado</strong></td>
  <td>
    {totalComprado.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    })}
  </td>
</tr>

<tr>
  <td><strong>Total pagado</strong></td>
  <td>
    {totalPagado.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    })}
  </td>
</tr>

<tr>
  <td><strong>Saldo pendiente</strong></td>
  <td>
    {saldoPendiente.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    })}
  </td>
</tr>

<tr>
  <td><strong>Última compra</strong></td>
  <td>{ultimaCompra}</td>
</tr>
              <tr>
                <td><strong>Notas</strong></td>
                <td>{client.notes ?? "-"}</td>
              </tr>

            </tbody>
          </table>
<div style={{ marginTop: 35 }}>
  <h2>Pedidos del cliente</h2>

  <p style={{ marginBottom: 15 }}>
    {orders.length} pedidos registrados
  </p>

  {orders.length === 0 ? (
    <p>Este cliente todavía no tiene pedidos.</p>
  ) : (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Total</th>
            <th>Pagado</th>
            <th>Saldo</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => {
            const balance =
              Number(order.total || 0) -
              Number(order.paid || 0);

            return (
              <tr key={order.id}>
                <td>
                  <strong>{order.product}</strong>
                </td>

                <td>
                  {Number(order.total || 0).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </td>

                <td>
                  {Number(order.paid || 0).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </td>

                <td>
                  {balance.toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </td>

                <td>{order.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</div>
        </section>

      </AppShell>
    </AuthGuard>
  );

}