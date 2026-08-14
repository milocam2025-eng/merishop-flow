"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { href: "/dashboard", label: "Inicio", icon: "⌂" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/pedidos", label: "Pedidos", icon: "🛍️" },
  { href: "/inventario", label: "Inventario", icon: "📦" },
  { href: "/pagos", label: "Pagos", icon: "💳" },
  { href: "/envios", label: "Envíos", icon: "🚚" },
  { href: "/reportes", label: "Reportes", icon: "📊" },
];

export default function AppShell({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <main className="app-shell">
      {/* Fondo oscuro al abrir menú móvil */}
      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-menu-overlay"
          aria-label="Cerrar menú"
          onClick={closeMobileMenu}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`sidebar ${
          mobileMenuOpen ? "mobile-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            M
          </div>

          <div>
            <strong>MeriShop Flow</strong>
            <span>Pro v5</span>
          </div>

          <button
            type="button"
            className="mobile-close-button"
            onClick={closeMobileMenu}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <nav>
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              className={
                pathname === item.href
                  ? "active"
                  : ""
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>Administrador</span>

          <button
            type="button"
            onClick={logout}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO */}
      <section className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            {/* Botón visible solamente en teléfono */}
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() =>
                setMobileMenuOpen(true)
              }
              aria-label="Abrir menú"
            >
              ☰
            </button>

            <div>
              <h1>{title}</h1>
              <p>
                Administración de MeriShop
              </p>
            </div>
          </div>

          <div className="topbar-pill">
            MeriShop Flow Pro
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}