"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  brand?: string | null;
  category?: string | null;
};

export default function InventarioPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    sku: "", product: "", quantity: "1", status: "Disponible", brand: "", category: ""
  });
  const [message, setMessage] = useState("");

  async function load() {
    const { data, error } = await createClient()
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    setRows((data as InventoryRow[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.sku, r.product, r.brand, r.category, r.status]
        .some(v => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, string | number | null> = {
      user_id: user.id,
      sku: form.sku.trim() || null,
      product: form.product.trim(),
      quantity: Number(form.quantity),
      status: form.status
    };
    if (form.brand.trim()) payload.brand = form.brand.trim();
    if (form.category.trim()) payload.category = form.category.trim();

    const { error } = await supabase.from("inventory").insert(payload);

    if (error) { setMessage(error.message); return; }
    setForm({ sku: "", product: "", quantity: "1", status: "Disponible", brand: "", category: "" });
    setMessage("Artículo agregado al inventario.");
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este artículo?")) return;
    await createClient().from("inventory").delete().eq("id", id);
    load();
  }

  const units = filtered.reduce((s, r) => s + Number(r.quantity || 0), 0);

  return (
    <AuthGuard>
      <AppShell title="Inventario">
        <section className="panel">
          <div className="section-title">
            <div><h2>Agregar artículo</h2><p>Controla existencias, estado y clasificación.</p></div>
          </div>
          <form className="form-grid" onSubmit={submit}>
            <label>SKU<input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></label>
            <label>Producto<input required value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} /></label>
            <label>Marca<input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></label>
            <label>Categoría<input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label>
            <label>Cantidad<input type="number" min="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>
            <label>Estado<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>Disponible</option><option>Apartado</option><option>Vendido</option></select></label>
            <button type="submit">Guardar artículo</button>
          </form>
          <p className="message">{message}</p>
        </section>

        <section className="panel">
          <div className="section-title">
            <div><h2>Inventario actual</h2><p>{filtered.length} artículos · {units} unidades</p></div>
            <input className="search-input" placeholder="Buscar SKU, producto o marca..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>SKU</th><th>Producto</th><th>Marca</th><th>Categoría</th><th>Cantidad</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td>{row.sku || "-"}</td>
                    <td><strong>{row.product}</strong></td>
                    <td>{row.brand || "-"}</td>
                    <td>{row.category || "-"}</td>
                    <td>{row.quantity}</td>
                    <td><StatusBadge value={row.status}/></td>
                    <td><button className="danger" onClick={() => remove(row.id)}>Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
