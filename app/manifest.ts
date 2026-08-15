import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MeriShop Flow Pro",
    short_name: "MeriShop",
    description:
      "Administración de clientes, pedidos, inventario, pagos y envíos de MeriShop.",

    start_url: "/dashboard",
    display: "standalone",

    background_color: "#f4f7fb",
    theme_color: "#123b67",

    orientation: "portrait",

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