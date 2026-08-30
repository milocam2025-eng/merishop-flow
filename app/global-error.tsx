"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main className="system-message-page">
          <section className="system-message-card" role="alert">
            <div className="system-message-icon">⚠️</div>
            <h1>MeriShop necesita recargarse</h1>
            <p>La información guardada no se modificó. Intenta abrir la aplicación nuevamente.</p>
            <button type="button" onClick={reset}>Recargar aplicación</button>
          </section>
        </main>
      </body>
    </html>
  );
}
