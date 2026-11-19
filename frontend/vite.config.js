
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
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],

        devOptions: {
          enabled: true,
          type: 'module'
        },

        manifest: {
          name: 'BMS Real-time Chat',
          short_name: 'BMS Chat',
          description: 'سیستم چت بلادری مدرن',
          theme_color: '#6366f1',
          background_color: '#0f172a',
          display: 'standalone',

          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
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
    preview: { port: 5000 },
  };
});
