import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // When running behind Caddy/NGINX, set VITE_HTTPS=false to serve HTTP upstream
  const useHttps = env.VITE_HTTPS !== 'false'

  const server: any = {
    host: true,
    port: 5173,
    allowedHosts: ['localhost', 'search.mangwale.ai', 'search.test.mangwale.ai', 'host.docker.internal'],
    proxy: {
      '/search': process.env.API_URL || 'http://localhost:3100',
      '/analytics': process.env.API_URL || 'http://localhost:3100',
      '/health': process.env.API_URL || 'http://localhost:3100',
      '/v2': process.env.API_URL || 'http://localhost:3100',
    },
  }
  if (useHttps) {
    // Use default self-signed cert from basic-ssl plugin
    server.https = {}
  }

  return {
    plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
    server,
  }
})
