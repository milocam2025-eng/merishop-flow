import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/tienda",
    name: "MeriShop — Compras seleccionadas",
    short_name: "MeriShop",
    description:
      "Productos seleccionados, atención personalizada y seguimiento de compras con MeriShop.",
    start_url: "/tienda?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#fffbf9",
    theme_color: "#0d2b4b",
    orientation: "any",
    lang: "es-MX",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
