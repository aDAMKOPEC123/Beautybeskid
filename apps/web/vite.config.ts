import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,ico,png,svg,webp}'],
        globIgnores: ['registerSW.js', 'sw.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cosmo/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@mux/mux-player-react': path.resolve(__dirname, 'src/lib/mux-stub.ts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'sonner'],
          'vendor-editor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-image',
            '@tiptap/extension-link',
          ],
          'vendor-flow': ['@xyflow/react'],
          'vendor-calendar': [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/timegrid',
            '@fullcalendar/list',
            '@fullcalendar/interaction',
            '@fullcalendar/resource-timegrid',
          ],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    hmr: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true
      }
    }
  }
});
