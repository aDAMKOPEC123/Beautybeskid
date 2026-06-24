import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

const normalizePath = (id: string) => id.replace(/\\/g, '/');
const hasPackage = (id: string, packageName: string) =>
  normalizePath(id).includes(`/node_modules/${packageName}/`);

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  if (isBuild) {
    process.env.NODE_ENV = 'production';
  }

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: false,
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
    define: isBuild ? { 'process.env.NODE_ENV': '"production"' } : undefined,
    esbuild: isBuild ? { jsxDev: false } : undefined,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalized = normalizePath(id);
            if (!normalized.includes('/node_modules/')) return undefined;

            if (hasPackage(normalized, 'react') || hasPackage(normalized, 'react-dom') || hasPackage(normalized, 'react-router-dom')) {
              return 'vendor-react';
            }
            if (hasPackage(normalized, '@tanstack/react-query')) return 'vendor-query';
            if (hasPackage(normalized, 'framer-motion')) return 'vendor-motion';
            if (hasPackage(normalized, 'lucide-react')) return 'vendor-icons';
            if (hasPackage(normalized, 'sonner')) return 'vendor-toast';
            if (hasPackage(normalized, 'zustand')) return 'vendor-state';
            if (
              hasPackage(normalized, 'clsx') ||
              hasPackage(normalized, 'tailwind-merge') ||
              hasPackage(normalized, 'class-variance-authority')
            ) {
              return 'vendor-utils';
            }
            if (normalized.includes('/node_modules/@tiptap/') || hasPackage(normalized, 'prosemirror-model')) {
              return 'vendor-editor';
            }
            if (normalized.includes('/node_modules/@xyflow/') || normalized.includes('/node_modules/d3-')) {
              return 'vendor-flow';
            }
            if (normalized.includes('/node_modules/@fullcalendar/')) return 'vendor-calendar';
            if (
              hasPackage(normalized, 'react-hook-form') ||
              normalized.includes('/node_modules/@hookform/') ||
              hasPackage(normalized, 'zod')
            ) {
              return 'vendor-forms';
            }
            if (hasPackage(normalized, 'socket.io-client')) return 'vendor-socket';
            if (hasPackage(normalized, 'axios')) return 'vendor-http';
            if (hasPackage(normalized, 'react-helmet-async') || hasPackage(normalized, 'react-side-effect')) return 'vendor-helmet';
            if (normalized.includes('/node_modules/@radix-ui/')) return 'vendor-radix';
            if (hasPackage(normalized, 'date-fns')) return 'vendor-dates';

            return undefined;
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
  };
});
