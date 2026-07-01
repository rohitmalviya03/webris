import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ohif': {
        target: 'http://localhost:8042',
        changeOrigin: true,
      },
      '/dicom-web': {
        target: 'http://localhost:8042',
        changeOrigin: true,
      },
      '/wado': {
        target: 'http://localhost:8042',
        changeOrigin: true,
      },
      '/stone-webviewer': {
        target: 'http://localhost:8042',
        changeOrigin: true,
      },
    },
  },
})
