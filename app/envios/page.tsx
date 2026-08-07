"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";

type Client = { id: string; name: string };
type Shipment = { id: string; client_id: string | null; carrier: string | null; tracking: string | null; status: string };

export default function EnviosPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [rows, setRows] = useState<Shipment[]>([]);
  const [form, setForm] = useState({ client_id: "", carrier: "USPS", tracking: "", status: "Preparando" });
  const [message, setMessage] = useState("");

  async function load() {
    const s = createClient();
    const [c, sh] = await Promise.all([
      s.from("clients").select("id,name").order("name"),
      s.from("shipments").select("*").order("created_at", { ascending: false })
    ]);
    setClients((c.data as Client[]) ?? []);
    setRows((sh.data as Shipment[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;

    const { error } = await s.from("shipments").insert({
      user_id: user.id,
      client_id: form.client_id || null,
      carrier: form.carrier,
      tracking: form.tracking.trim() || null,
      status: form.status
    });
    if (error) { setMessage(error.message); return; }
    setForm({ client_id: "", carrier: "USPS", tracking: "", status: "Preparando" });
    setMessage("Envío guardado.");
    load();
  }

  const name = (id: string | null) => clients.find(c => c.id === id)?.name || "-";

  return (
    <AuthGuard>
      <AppShell title="Envíos">
        <section className="panel">
          <h2>Nuevo envío</h2>
          <form className="form-grid" onSubmit={submit}>
            <label>Cliente<select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}><option value="">Sin asignar</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
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
