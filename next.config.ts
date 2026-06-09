import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@radix-ui/react-*"],
  },
  turbopack: {
    resolveAlias: {},
  },
};

export default nextConfig;
