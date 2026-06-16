// Serveur statique minimal (zéro dépendance) pour servir la PWA Vue buildée
// (dossier dist/) sur Heroku. Fallback SPA → index.html. Écoute sur $PORT.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, normalize, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const PORT = Number(process.env.PORT) || 4173

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

async function send(res, path, status = 200) {
  const body = await readFile(path)
  res.writeHead(status, {
    'Content-Type': TYPES[extname(path)] || 'application/octet-stream',
  })
  res.end(body)
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0])
    // Empêche le path traversal : on borne le chemin à DIST.
    const rel = normalize(url).replace(/^(\.\.[/\\])+/, '').replace(/^\/+/, '')
    let file = join(DIST, rel)
    if (!file.startsWith(DIST)) file = join(DIST, 'index.html')

    try {
      const s = await stat(file)
      if (s.isDirectory()) file = join(file, 'index.html')
      await send(res, file)
    } catch {
      // Fichier absent → fallback SPA (routage par hash côté client).
      await send(res, join(DIST, 'index.html'))
    }
  } catch (e) {
    res.writeHead(500)
    res.end('Internal error')
    console.error(e)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`bmx static server → http://0.0.0.0:${PORT} (dist/)`)
})
