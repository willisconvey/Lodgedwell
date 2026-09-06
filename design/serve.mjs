#!/usr/bin/env node
// Minimal static server for design-system/ previews (no cwd use — the preview
// sandbox cannot call getcwd() inside iCloud Drive). Usage: node design/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'design-system');
const port = Number(process.argv[2] || 8899);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(rootDir, p));
    if (!file.startsWith(rootDir)) throw Object.assign(new Error('forbidden'), { code: 'EACCES' });
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(302, { Location: p + '/' }); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
    res.end(String(e.code || e));
  }
}).listen(port, '127.0.0.1', () => console.log(`design-system preview on http://127.0.0.1:${port}/`));
