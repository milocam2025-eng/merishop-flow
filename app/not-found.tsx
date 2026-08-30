import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-message-page">
      <section className="system-message-card">
        <div className="system-message-icon">🔎</div>
        <h1>Página no encontrada</h1>
        <p>El enlace no existe o pudo haber cambiado.</p>
        <Link href="/tienda">Ir a MeriShop</Link>
      </section>
    </main>
  );
}
