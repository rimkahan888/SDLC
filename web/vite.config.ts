import { existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

function requireContentExport(): Plugin {
  return {
    name: 'sdlc-require-content-export',
    apply: 'build',
    buildStart() {
      const stages = fileURLToPath(new URL('./public/data/stages.json', import.meta.url))
      if (!existsSync(stages)) {
        this.error(
          'Missing web/public/data/stages.json. Run `dotnet run --project api -- export web/public/data` before the production build.',
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    requireContentExport(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Dev reads /api. Vite proxies that to the local API.
    // https://vite.dev/config/server-options.html#server-proxy
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
})
