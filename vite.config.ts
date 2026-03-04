// vite.config.ts
import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true, // Para probar offline en desarrollo (muy útil)
      },
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "masked-icon.svg",
        "pwa-*.png",
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
        id: "/?utm_source=pwa",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
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
        // Cachea todos los assets estáticos generados por Vite
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json,woff,woff2}"],

        // Estrategias de caché en tiempo de ejecución (esto hace el offline real)
        runtimeCaching: [
          // 1. Navegación (páginas) → intenta red primero, fallback rápido a caché
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 10, // Si la red tarda >10s → usa caché
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
            },
          },

          // 2. JS y CSS → usa caché mientras actualiza en background
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 1 semana
              },
            },
          },

          // 3. Imágenes y media → caché primero (perfecto para offline)
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

          // 4. APIs de Supabase → intenta red primero, fallback a caché si offline
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 1 día (datos dinámicos no muy viejos)
              },
              cacheableResponse: {
                statuses: [0, 200], // Cachea respuestas OK y opacas (importante para fallback)
              },
            },
          },
        ],

        // Fallback cuando falla TODO (muestra offline.html)
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/_/, /.*?\.map$/], // Evita fallback en rutas internas o sourcemaps
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
