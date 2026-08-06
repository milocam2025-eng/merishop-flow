"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Stats={clients:number;orders:number;sales:number;pending:number};

export default function Dashboard(){
  const [stats,setStats]=useState<Stats>({clients:0,orders:0,sales:0,pending:0});
  const [name,setName]=useState("");
  const router=useRouter();

  useEffect(()=>{ load(); },[]);

  async function load(){
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.push("/login");return;}
    setName(user.email || "Usuario");

    const [clients,orders]=await Promise.all([
      supabase.from("clients").select("id",{count:"exact",head:true}),
      supabase.from("orders").select("total,paid")
    ]);
    const rows=orders.data||[];
    const sales=rows.reduce((s,o)=>s+Number(o.total||0),0);
    const paid=rows.reduce((s,o)=>s+Number(o.paid||0),0);
    setStats({clients:clients.count||0,orders:rows.length,sales,pending:Math.max(0,sales-paid)});
  }

  async function logout(){
    await createClient().auth.signOut();
    router.push("/login");
  }

  return <main className="dashboard">
    <aside>
      <div className="brand">MeriShop Flow</div>
      <nav>
        <a className="active">Inicio</a><a>Clientes</a><a>Pedidos</a>
        <a>Inventario</a><a>Pagos</a><a>Envíos</a><a>Reportes</a>
      </nav>
    </aside>
    <section className="content">
      <header><div><h1>Panel principal</h1><p>{name}</p></div><button onClick={logout}>Cerrar sesión</button></header>
      <div className="cards">
        <article><span>Clientes</span><strong>{stats.clients}</strong></article>
        <article><span>Pedidos</span><strong>{stats.orders}</strong></article>
        <article><span>Ventas</span><strong>${stats.sales.toFixed(2)}</strong></article>
        <article><span>Pendiente</span><strong>${stats.pending.toFixed(2)}</strong></article>
      </div>
      <article className="panel">
        <h2>Versión en la nube conectada</h2>
        <p>El inicio de sesión y las métricas ya están preparados para Supabase.</p>
        <p>Los siguientes módulos se conectarán a las tablas incluidas en el archivo SQL.</p>
      </article>
    </section>
  </main>;
}
