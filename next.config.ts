import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: false,
  },
  allowedDevOrigins: ['*.trycloudflare.com'],
};

export default nextConfig;
