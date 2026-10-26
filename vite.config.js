import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/apple-touch-icon.png",
      ],
      manifest: {
        name: "Sudoku",
        short_name: "Sudoku",
        description: "A calm, beautiful, ad-free Sudoku with hints that teach, daily puzzles and themes.",
        id: "/",
        start_url: "/",
        categories: ["games", "puzzle"],
        display: "standalone",
        background_color: "#131416",
        theme_color: "#131416",
        orientation: "any",
        shortcuts: [
          { name: "Daily puzzle", short_name: "Daily", url: "/?start=daily", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Quick easy game", short_name: "Easy", url: "/?start=easy", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
