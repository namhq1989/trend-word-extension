import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3070,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'scripts/background.js'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
        dir: 'dist',
      },
    },

    sourcemap: true,
  },
})
