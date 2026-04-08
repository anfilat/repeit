/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: process.env.VITE_BASE || '/repeit/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Repeit',
        short_name: 'Repeit',
        description: 'Audio player PWA',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
      },
    }),
    {
      name: 'copy-pwa-icons',
      writeBundle() {
        const publicDir = path.resolve(__dirname, 'public');
        const outDir = path.resolve(__dirname, 'dist');

        const icons = ['pwa-192x192.svg', 'pwa-512x512.svg'];
        icons.forEach(icon => {
          const src = path.join(publicDir, icon);
          const dest = path.join(outDir, icon);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
          }
        });
      },
    },
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
