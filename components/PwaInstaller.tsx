"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export default function PwaInstaller() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    setInstalled(isStandalone());
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("No se pudo registrar la app de MeriShop:", error);
      });
    }

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setInstalled(false);
    }

    function handleInstalled() {
      setPromptEvent(null);
      setShowIosHelp(false);
      setInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed || (!promptEvent && !isIos)) return null;

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setPromptEvent(null);
        setInstalled(true);
      }
      return;
    }

    setShowIosHelp((current) => !current);
  }

  return (
    <section className="pwa-install-card" aria-label="Instalar MeriShop">
      <div className="pwa-install-copy">
        <strong>📱 Lleva MeriShop en tu teléfono</strong>
        <span>Instálala gratis y abre la tienda directamente desde tu pantalla de inicio.</span>
        {showIosHelp && (
          <div className="pwa-install-help" role="status">
            En Safari, toca <strong>Compartir</strong> y después
            <strong> Agregar a pantalla de inicio</strong>.
          </div>
        )}
      </div>
      <button className="pwa-install-button" type="button" onClick={install}>
        {isIos && !promptEvent ? "Cómo instalar" : "Instalar MeriShop"}
      </button>
    </section>
  );
}
