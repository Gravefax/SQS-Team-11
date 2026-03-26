import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL;
const apiBase = process.env.API_BASE;

if (!backendUrl) {
  throw new Error("Missing required env var BACKEND_URL");
}

if (!apiBase) {
  throw new Error("Missing required env var API_BASE");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: `${apiBase}/:path*`,
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
