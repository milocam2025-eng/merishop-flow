"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  created_at: string;
};

export default function ClientesPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", location: "" });
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("clients").insert({
      user_id: user.id,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      location: form.location.trim() || null
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({ name: "", phone: "", email: "", location: "" });
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
          <h2>Nuevo cliente</h2>
          <form className="form-grid" onSubmit={submit}>
            <label>Nombre<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>WhatsApp<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Correo<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            <label>Ubicación<input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></label>
            <button type="submit">Guardar cliente</button>
          </form>
          <p className="message">{message}</p>
        </section>

        <section className="panel table-wrap">
          <h2>Clientes registrados</h2>
          <table>
            <thead><tr><th>Nombre</th><th>WhatsApp</th><th>Correo</th><th>Ubicación</th><th></th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td>{row.name}</td><td>{row.phone || "-"}</td><td>{row.email || "-"}</td><td>{row.location || "-"}</td>
                  <td><button className="danger" type="button" onClick={() => remove(row.id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
