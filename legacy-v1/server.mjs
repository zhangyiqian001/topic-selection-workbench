import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {fetchRadar} from './feeds.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(pathname==='/api/radar'){
      if(req.method!=='GET'){res.writeHead(405);res.end('Method not allowed');return;}
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(JSON.stringify(await fetchRadar()));return;
    }
    const name = pathname === '/' ? '/index.html' : pathname;
    if (!['/index.html', '/style.css', '/app.js', '/core.js','/radar-core.js','/discovery.js'].includes(name)) { res.writeHead(404); res.end('Not found'); return; }
    const content = await fs.readFile(path.join(root, name));
    res.writeHead(200, {'Content-Type': mime[path.extname(name)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}); res.end(content);
  } catch { res.writeHead(500); res.end('Unable to load application'); }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port is already in use. Open http://127.0.0.1:4173 in your browser, or close the other studio window first.' : `Server error: ${error.message}`);
  process.exitCode = 1;
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Content Studio ready: http://127.0.0.1:${server.address().port}`));
