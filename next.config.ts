import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@techstark/opencv-js"],
  turbopack: {
    resolveAlias: {
      fs: { browser: "empty-module" },
      path: { browser: "empty-module" },
      crypto: { browser: "empty-module" },
    },
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
