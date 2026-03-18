import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack config for fallback when using --webpack flag
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
      };
    }

    return config;
  },

  // Turbopack config (default bundler in Next.js 16)
  turbopack: {
    resolveAlias: {
      fs: { browser: "./src/lib/empty.js" },
      net: { browser: "./src/lib/empty.js" },
      tls: { browser: "./src/lib/empty.js" },
    },
  },
};

export default nextConfig;
