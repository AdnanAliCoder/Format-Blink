import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/google:filename([A-Za-z0-9_-]+).html",
        destination: "/api/verification/google:filename.html",
      },
    ];
  },
};

export default nextConfig;
