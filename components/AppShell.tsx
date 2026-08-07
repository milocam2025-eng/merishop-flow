"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { href: "/dashboard", label: "Inicio", icon: "⌂" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/pedidos", label: "Pedidos", icon: "🛍️" },
  { href: "/inventario", label: "Inventario", icon: "📦" },
  { href: "/pagos", label: "Pagos", icon: "💳" },
  { href: "/envios", label: "Envíos", icon: "🚚" },
  { href: "/reportes", label: "Reportes", icon: "📊" }
];

export default function AppShell({
  title,
  children
}: Readonly<{ title: string; children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand">MeriShop Flow</div>
            <div className="brand-sub">Pro v5</div>
          </div>
        </div>

        <nav>
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>Administrador</span>
          <button type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p>Administración de MeriShop</p>
          </div>
          <div className="topbar-pill">MeriShop Flow Pro</div>
        </header>
        {children}
      </section>
    </main>
  );
}
