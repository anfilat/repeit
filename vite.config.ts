/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

const base = process.env.VITE_BASE || '/repeit/';
const isBeta = base.includes('beta');

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: base,
        name: isBeta ? 'Repeit Beta' : 'Repeit',
        short_name: isBeta ? 'Repeit Beta' : 'Repeit',
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
        cacheId: isBeta ? 'repeit-beta' : 'repeit',
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
