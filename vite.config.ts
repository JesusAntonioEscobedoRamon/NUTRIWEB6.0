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
        enabled: true, // Para que funcione también en desarrollo (útil para pruebas)
      },
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "masked-icon.svg",
        "pwa-*.png",
      ],
      manifest: {
        name: "Nutri U - Nutrición Personalizada",
        short_name: "NutriU",
        description:
          "Seguimiento nutricional, citas con nutriólogos y planes personalizados",
        theme_color: "#2E8B57",
        background_color: "#F8FFF9",
        display: "standalone",
        display_override: ["standalone", "fullscreen", "minimal-ui"], // Mejora compatibilidad iOS/Android
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
            purpose: "maskable", // Obligatorio para Android (ícono redondo)
          },
        ],
        // Optimizaciones específicas para iOS
        ios: {
          "apple-mobile-web-app-capable": "yes",
          "apple-mobile-web-app-status-bar-style": "black-translucent",
        },
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
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
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
