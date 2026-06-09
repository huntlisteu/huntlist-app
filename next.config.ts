import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ygoprodeck.com',
      },
    ],
  },
  // React Compiler attivo (Next.js 16, stabile). Richiede babel-plugin-react-compiler.
  reactCompiler: true,
  // Fissa la root del workspace su questa cartella: evita che Next inferisca
  // erroneamente la root da lockfile presenti in directory genitrici.
  turbopack: {
    root: import.meta.dirname,
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "app.huntlist.eu" }],
        destination: "https://huntlist.eu/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
