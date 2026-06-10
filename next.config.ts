import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ygoprodeck.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
      },
      {
        protocol: 'https',
        hostname: 'images.scrydex.com',
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
      // Vecchi URL del catalogo carte (/[game]/carte/...) → nuova struttura /carte/[game]/...
      // Il vincolo regex sul gioco evita loop di redirect su /carte/carte/:slug.
      {
        source: "/:game(yugioh|pokemon|one_piece)/carte",
        destination: "/carte/:game",
        permanent: true,
      },
      {
        source: "/:game(yugioh|pokemon|one_piece)/carte/:slug",
        destination: "/carte/:game/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
