import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    solidPlugin(),
    crx({ manifest })
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.html',
        options: 'src/options/options.html'
      }
    },
    // Disable module preloading for service workers
    modulePreload: false
  },
  server: {
    port: 5173,
    strictPort: true
  }
})