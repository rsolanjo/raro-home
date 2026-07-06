import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'RARO Home',
        short_name: 'RARO',
        description: 'Sistema de gestão RARO Home: propostas, projeto executivo, contratos e obra.',
        theme_color: '#0B1830',
        background_color: '#F7F6F3',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // cache do app shell; deixa API/Supabase sempre na rede (network-first não faz sentido cachear dados sensíveis)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://cdn.jsdelivr.net',
            handler: 'CacheFirst',
            options: { cacheName: 'cdn-assets', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 90 } }
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1500
  }
})
