"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");
  const router=useRouter();

  async function submit(e:FormEvent){
    e.preventDefault();
    setMessage("Procesando...");
    const supabase=createClient();
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setMessage(error.message);return;}
    router.push("/dashboard");
  }

  async function register(){
    const supabase=createClient();
    const {error}=await supabase.auth.signUp({email,password});
    setMessage(error ? error.message : "Cuenta creada. Revisa tu correo para confirmarla.");
  }

  return <main className="login-page">
    <section className="login-card">
      <div className="logo">M</div>
      <h1>MeriShop Flow</h1>
      <p>Administra clientes, pedidos, pagos e inventario.</p>
      <form onSubmit={submit}>
        <label>Correo<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Contraseña<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <button type="submit">Iniciar sesión</button>
        <button type="button" className="light" onClick={register}>Crear cuenta</button>
      </form>
      <small>{message}</small>
    </section>
  </main>;
}
