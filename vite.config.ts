import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/MergeBakery/',
  plugins: [
    // Installable app with offline play (T5.13). The service worker only runs in
    // builds, so `npm run dev` keeps hot reload and the dev console tools.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Rise & Shine Bakery',
        short_name: 'Rise & Shine',
        description: "A cozy merge game about reopening Grandma's bakery.",
        theme_color: '#9c5b2e',
        background_color: '#fff6e6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Every art file is cached, so the whole game plays offline.
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Vitest replaces CSS with empty strings unless included; tokens.test.ts reads tokens.css.
    css: { include: [/tokens\.css/] },
  },
});
