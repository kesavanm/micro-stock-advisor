import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
const adminProxy = {
  '/advisor/api/admin': {
    target: 'http://127.0.0.1:8081',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/advisor\/api\/admin/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  base: '/advisor/',
  server: {
    proxy: adminProxy,
  },
  preview: {
    proxy: adminProxy,
  },
})
