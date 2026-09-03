import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // App shell no precache; imagens grandes (chapas/ambientes) via runtime cache.
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/chapas/") ||
              url.pathname.startsWith("/ambientes/"),
            handler: "CacheFirst",
            options: {
              cacheName: "imagens-pedras",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "DF Mármores — Projeto e Orçamento",
        short_name: "DF Projeto",
        description:
          "Monte o projeto da bancada com o cliente e feche o orçamento na hora.",
        theme_color: "#1e2a45",
        background_color: "#f4f5f6",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "/favicon.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/favicon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
