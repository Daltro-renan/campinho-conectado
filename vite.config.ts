import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(root, "client"),
  publicDir: path.resolve(root, "public"),
  envDir: root,
  build: {
    outDir: path.resolve(root, "dist/public"),
    emptyOutDir: true,
  },
  css: {
    postcss: {
      plugins: [tailwindcss({ config: path.resolve(root, "tailwind.config.ts") }), autoprefixer()],
    },
  },
  server: {
    // Necessário para rodar dentro do Replit ou de outros ambientes com proxy
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Campinho Conectado",
        short_name: "Campinho",
        description: "Gestão do seu clube de futebol: jogos, elenco, mensalidades e chat.",
        lang: "pt-BR",
        theme_color: "#0A1B2E",
        background_color: "#071526",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // A API nunca deve vir do cache
        navigateFallbackDenylist: [/^\/api\//, /\.html$/],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(root, "client/src"),
      "@shared": path.resolve(root, "shared"),
    },
  },
});
