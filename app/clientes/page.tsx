"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  notes?: string | null;
  created_at: string;
};

export default function ClientesPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", location: "", notes: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const { data, error } = await createClient()
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setMessage(error.message);
    setRows((data as ClientRow[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.name, r.phone, r.email, r.location].some(v => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, string | null> = {
      user_id: user.id,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      location: form.location.trim() || null
    };
    if (form.notes.trim()) payload.notes = form.notes.trim();

    const { error } = await supabase.from("clients").insert(payload);

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({ name: "", phone: "", email: "", location: "", notes: "" });
    setMessage("Cliente guardado correctamente.");
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    const { error } = await createClient().from("clients").delete().eq("id", id);
    if (error) setMessage(error.message);
    else load();
  }

  return (
    <AuthGuard>
      <AppShell title="Clientes">
        <section className="panel">
          <div className="section-title">
            <div><h2>Nuevo cliente</h2><p>Agrega información básica y contacto.</p></div>
          </div>
          <form className="form-grid" onSubmit={submit}>
            <label>Nombre<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>WhatsApp<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Correo<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            <label>Ubicación<input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></label>
            <label className="span-2">Notas<input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Preferencias, instrucciones de entrega, etc."/></label>
            <button type="submit">Guardar cliente</button>
          </form>
          <p className="message">{message}</p>
        </section>

        <section className="panel">
          <div className="section-title">
            <div><h2>Clientes registrados</h2><p>{filtered.length} resultados</p></div>
            <input className="search-input" placeholder="Buscar cliente..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>WhatsApp</th><th>Correo</th><th>Ubicación</th><th></th></tr></thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td><strong>{row.name}</strong></td>
                    <td>{row.phone || "-"}</td>
                    <td>{row.email || "-"}</td>
                    <td>{row.location || "-"}</td>
                    <td><button className="danger" type="button" onClick={() => remove(row.id)}>Eliminar</button></td>
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
