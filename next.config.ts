import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright abre el servidor local con 127.0.0.1 en CI.
  // Limitarlo explícitamente evita que Next.js bloquee los módulos del cliente.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
