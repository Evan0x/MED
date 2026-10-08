import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serve the Vercel functions in /api during `npm run dev`, so the server-only
// keys in .env (no VITE_ prefix) work locally without `vercel dev`.
const devApi = () => ({
  name: 'dev-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const match = req.url?.match(/^\/api\/([a-z-]+)(?:\?|$)/)
      if (!match) return next()
      try {
        const mod = await server.ssrLoadModule(`/api/${match[1]}.js`)
        const handler = mod[req.method]
        if (!handler) {
          res.statusCode = 405
          return res.end()
        }

        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const request = new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method,
          headers: req.headers,
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
        })

        const response = await handler(request)
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(Buffer.from(await response.arrayBuffer()))
      } catch (err) {
        if (err?.code === 'ERR_LOAD_URL') return next()
        console.error(err)
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'Server error' }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Expose non-VITE_ vars from .env to the /api handlers (server only, never bundled).
  // Real shell vars win; .env values are re-applied on every restart so edits take effect.
  globalThis.__shellEnvKeys ??= new Set(Object.keys(process.env))
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
    if (!globalThis.__shellEnvKeys.has(key)) process.env[key] = value
  }
  return {
    plugins: [react(), devApi()],
  }
})
