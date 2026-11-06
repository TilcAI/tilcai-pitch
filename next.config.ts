import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // En `npm run dev` Next bloquea los recursos de desarrollo pedidos desde otro host.
  // Se permiten la red de Tailscale (IPs 100.x y nombres *.ts.net) y la red local.
  allowedDevOrigins: ["100.*.*.*", "**.ts.net", "saul-pc", "192.168.*.*", "10.*.*.*"],
};

export default config;
