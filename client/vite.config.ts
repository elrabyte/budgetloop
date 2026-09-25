import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxies /api to the local API dev server (see api/README / npm run dev) so the client can
    // always call relative `/api/...` URLs, both here and in production behind nginx (see
    // client/Dockerfile + client/nginx.conf.template).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
