"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setMessage("Escribe tu nueva contraseña.");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("Ingresando...");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function forgotPassword() {
    if (!email) {
      setMessage("Escribe primero tu correo.");
      return;
    }

    setMessage("Enviando correo de recuperación...");

    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Correo enviado. Abre el enlace más reciente de recuperación."
    );
  }

  async function updatePassword() {
    if (newPassword.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setMessage("Actualizando contraseña...");

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Contraseña actualizada correctamente.");

    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="logo">M</div>

        <h1>MeriShop Flow Pro</h1>

        <p>Acceso administrativo exclusivo para personal autorizado.</p>

        {recoveryMode ? (
          <>
            <h2>Nueva contraseña</h2>

            <label>
              Nueva contraseña
              <input
                type="password"
                minLength={6}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <button type="button" onClick={updatePassword}>
              Guardar nueva contraseña
            </button>
          </>
        ) : (
          <form onSubmit={login}>
            <label>
              Correo
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button type="submit">Iniciar sesión</button>

            <button
              type="button"
              className="secondary"
              onClick={forgotPassword}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        <small>{message}</small>
      </section>
    </main>
  );
}
