import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.stuller.com",
      },
      {
        protocol: "https",
        hostname: "**.stullercloud.com",
      },
      {
        protocol: "https",
        hostname: "**.qgold.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
