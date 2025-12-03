import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0, // Don't inline audio files
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep audio files with their original names
          if (assetInfo.name && assetInfo.name.endsWith('.ogg')) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  assetsInclude: ['**/*.ogg'] // Explicitly include .ogg files as assets
})