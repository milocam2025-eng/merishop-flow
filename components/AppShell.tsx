
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NavigationItem = {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
};

const navigation: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: "⌂",
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: "👥",
  },
  {
    href: "/pedidos",
    label: "Pedidos",
    icon: "🛍️",
  },
  {
    href: "/inventario",
    label: "Inventario",
    icon: "📦",
  },

  // TIENDA MERISHOP
  {
    href: "https://merishop-flow.vercel.app/tienda",
    label: "Mi Tienda",
    icon: "🏪",
   },

  {
    href: "/publicar",
    label: "Publicar",
    icon: "📲",
  },
  {
    href: "/pagos",
    label: "Pagos",
    icon: "💳",
  },
  {
    href: "/envios",
    label: "Envíos",
    icon: "🚚",
  },
  {
    href: "/reportes",
    label: "Reportes",
    icon: "📊",
  },
];

export default function AppShell({
  title,
  subtitle = "Administración de MeriShop",
  headerExtra,
  children,
}: Readonly<{
  title: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
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
          {navigation.map((item) => {
            // ENLACE EXTERNO - TIENDA
            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                  className="store-link"
                >
                  <span>{item.icon}</span>
                  {item.label}
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "12px",
                      opacity: 0.7,
                    }}
                  >
                    ↗
                  </span>
                </a>
              );
            }

            // ENLACES INTERNOS
            return (
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
            );
          })}
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
              <p>{subtitle}</p>
            </div>
          </div>

          {headerExtra ? (
            <div>{headerExtra}</div>
          ) : (
            <div className="topbar-pill">
              MeriShop Flow Pro
            </div>
          )}
        </header>

        {children}
      </section>
    </main>
  );
}