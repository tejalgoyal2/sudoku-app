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
        "icons/maskable-512.png",
      ],
      manifest: {
        name: "Sudoku",
        short_name: "Sudoku",
        description: "A simple, ad-free Sudoku. Daily puzzle, hints that teach, timed challenges and 11 themes. Works offline.",
        id: "/",
        start_url: "/",
        categories: ["games", "puzzle"],
        display: "standalone",
        background_color: "#16233F",
        theme_color: "#F6F6F3",
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
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Accented-Latin font files only load if such text ever appears; don't download them up front.
        globIgnores: ["**/*latin-ext*", "og.png"],
      },
    }),
  ],
});
