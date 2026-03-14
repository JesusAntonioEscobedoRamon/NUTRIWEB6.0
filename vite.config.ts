// vite.config.ts
import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    },
  },
  preview: {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: false,
      manifestFilename: "manifest-nutriu-v6.webmanifest",
      registerType: "autoUpdate",
      devOptions: {
        enabled: false, // En dev puede volver lenta la navegación por SW
      },
      includeAssets: [
        "favicon.ico",
        "logotipo_mini.png",
        "pwa-48x48-nutriu-v6.png",
        "pwa-64x64-nutriu-v6.png",
        "pwa-72x72-nutriu-v6.png",
        "pwa-96x96-nutriu-v6.png",
        "pwa-128x128-nutriu-v6.png",
        "pwa-192x192-nutriu-v6.png",
        "pwa-256x256-nutriu-v6.png",
        "pwa-384x384-nutriu-v6.png",
        "pwa-512x512-nutriu-v6.png",
        "pwa-512x512-maskable-nutriu-v6.png",
        "masked-icon.svg",
      ],
      manifest: {
        name: "Nutri U",
        short_name: "NutriU",
        description:
          "Seguimiento nutricional, citas con nutriólogos y planes personalizados",
        theme_color: "#2E8B57",
        background_color: "#F8FFF9",
        display: "standalone",
        display_override: ["standalone", "fullscreen", "minimal-ui"],
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",
        id: "/?utm_source=pwa_nutriu_v6",
        icons: [
          {
            src: "/pwa-48x48-nutriu-v6.png",
            sizes: "48x48",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-64x64-nutriu-v6.png",
            sizes: "64x64",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-72x72-nutriu-v6.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-96x96-nutriu-v6.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-128x128-nutriu-v6.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-192x192-nutriu-v6.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-256x256-nutriu-v6.png",
            sizes: "256x256",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-384x384-nutriu-v6.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512-nutriu-v6.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512-maskable-nutriu-v6.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable", // Obligatorio para Android
          },
        ],
        // Optimizaciones específicas para iOS
        ios: {
          "apple-mobile-web-app-capable": "yes",
          "apple-mobile-web-app-status-bar-style": "black-translucent",
        },
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Cachea todos los assets estáticos generados por Vite
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json,woff,woff2}"],

        // Runtime caching: SOLO imágenes externas (ej. fotos de perfil de Supabase Storage).
        // NO cachear navegación ni JS/CSS: ya están en el precache versionado de Workbox
        // y un runtime cache tiene MAYOR prioridad que el precache, lo que causaría servir
        // index.html o chunks con hashes viejos tras un build nuevo → freeze en refresh.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
            },
          },
        ],

        // En una SPA, el refresh de rutas debe volver a index.html
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/_/,
          /^\/api\//,
          /.*?\.map$/,
          /.*?\.js$/,
          /.*?\.mjs$/,
          /.*?\.css$/,
          /.*?\.json$/,
          /.*?\.woff2?$/,
          /.*?\.png$/,
          /.*?\.svg$/,
          /.*?\.webp$/,
          /^\/assets\//,
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
