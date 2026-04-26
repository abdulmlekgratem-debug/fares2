import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  server: {
    host: '::',
    port: 8080
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.xlsx'],
  build: {
    // تحسين حجم الملفات
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      output: {
        // فصل المكتبات الكبيرة لتحسين التخزين المؤقت
        manualChunks: {
          'xlsx': ['xlsx'],
          'leaflet': ['leaflet', 'react-leaflet'],
        }
      }
    }
  },
}));
