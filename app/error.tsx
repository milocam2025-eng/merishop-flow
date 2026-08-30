"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/lib/logger";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError("Error de página", error);
  }, [error]);

  return (
    <main className="system-message-page">
      <section className="system-message-card" role="alert">
        <div className="system-message-icon">⚠️</div>
        <h1>No pudimos completar esta acción</h1>
        <p>Intenta nuevamente. Si el problema continúa, vuelve al inicio.</p>
        <div className="system-message-actions">
          <button type="button" onClick={reset}>Intentar de nuevo</button>
          <Link href="/dashboard">Volver al inicio</Link>
        </div>
      </section>
    </main>
  );
}
