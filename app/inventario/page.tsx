"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";

type InventoryRow = {
  id: string;
  sku: string | null;
  product: string;
  quantity: number;
  status: string;
};

export default function InventarioPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [form, setForm] = useState({ sku: "", product: "", quantity: "1", status: "Disponible" });
  const [message, setMessage] = useState("");

  async function load() {
    const { data, error } = await createClient().from("inventory").select("*").order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    setRows((data as InventoryRow[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("inventory").insert({
      user_id: user.id,
      sku: form.sku.trim() || null,
      product: form.product.trim(),
      quantity: Number(form.quantity),
      status: form.status
    });

    if (error) { setMessage(error.message); return; }
    setForm({ sku: "", product: "", quantity: "1", status: "Disponible" });
    setMessage("Artículo agregado al inventario.");
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este artículo?")) return;
    await createClient().from("inventory").delete().eq("id", id);
    load();
  }

  return (
    <AuthGuard>
      <AppShell title="Inventario">
        <section className="panel">
          <h2>Agregar artículo</h2>
          <form className="form-grid" onSubmit={submit}>
            <label>SKU<input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></label>
            <label>Producto<input required value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} /></label>
            <label>Cantidad<input type="number" min="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>
            <label>Estado<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>Disponible</option><option>Apartado</option><option>Vendido</option></select></label>
            <button type="submit">Guardar artículo</button>
          </form>
          <p className="message">{message}</p>
        </section>

        <section className="panel table-wrap">
          <table><thead><tr><th>SKU</th><th>Producto</th><th>Cantidad</th><th>Estado</th><th></th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}><td>{row.sku || "-"}</td><td>{row.product}</td><td>{row.quantity}</td><td><StatusBadge value={row.status}/></td><td><button className="danger" onClick={() => remove(row.id)}>Eliminar</button></td></tr>)}</tbody></table>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
