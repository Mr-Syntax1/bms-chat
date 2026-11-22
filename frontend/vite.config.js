import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '', 'VITE_')
  const API_URL = env.VITE_API_URL || 'http://localhost:3000'

  return {
    plugins: [
      react(),
      tailwindcss(),

      nodePolyfills({
        exclude: ['@ably/pubsub-device', '@ably/pubsub-core']
      }),

      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],

        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html'
        },

        manifest: {
          name: 'BMS Real-time Chat',
          short_name: 'BMS Chat',
          description: 'سیستم چت بلادری مدرن',
          theme_color: '#6366f1',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',

          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        
        workbox: {
          // اضافه کردن فرمت‌های صوتی و wasm به الگوهای کش
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,mp3,m4a,wasm}'],
          
          // دیکودر Draco و مدل‌های سنگین بازی نباید توسط Service Worker کش شوند
          globIgnores: ['draco/**', 'game-models/**'],
          
          //  رفع خطای اصلی: افزایش محدودیت حجم فایل مجاز برای کش به ۱۰ مگابایت
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, 
        }
      })
    ],

    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    
    optimizeDeps: {
      include: ['@ably/pubsub-device'],
    },

    server: {
      port: 5001,
      host: '0.0.0.0',
      proxy: {
        '/auth': { target: API_URL, changeOrigin: true },
        '/upload': { target: API_URL, changeOrigin: true },
        '/api': { target: API_URL, changeOrigin: true },
      },
    },
    
    preview: { 
      port: 5000 
    },

    //  بهینه‌سازی Code Splitting با تابع (سازگار با Rolldown)
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor';
              }
              if (id.includes('three') || id.includes('@react-three')) {
                return 'three';
              }
              if (id.includes('livekit')) {
                return 'livekit';
              }
              if (id.includes('ably') || id.includes('@ably')) {
                return 'ably';
              }
              if (id.includes('zustand')) {
                return 'zustand';
              }
            }
          }
        }
      }
    }
  };
})