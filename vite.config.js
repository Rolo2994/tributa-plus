import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Configuración de Vite + plugin de React + plugin de PWA.
// El plugin VitePWA genera automáticamente el manifest.json y el
// service-worker.js al hacer "npm run build" — no hace falta escribirlos
// a mano ni mantenerlos sincronizados manualmente.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Tributa+ — Gestión SUNAT',
        short_name: 'Tributa+',
        description: 'Gestión de RUCs, vencimientos y acciones SUNAT para contadores independientes.',
        theme_color: '#0B3A60',
        background_color: '#EEF2F7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Cachea los assets de la app para que abra offline con los
        // últimos datos sincronizados (el Excel/Sheet en sí no se
        // cachea aquí; eso lo maneja la capa de sincronización).
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      }
    })
  ]
})
