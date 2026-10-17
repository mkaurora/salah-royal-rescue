/* Tiny static server that mounts this folder at /salah-royal-rescue/engineer/ (like GitHub Pages). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = '/salah-royal-rescue/engineer/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain'
};

function createServer() {
  return http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/' || url === '/salah-royal-rescue/engineer') { res.writeHead(302, { Location: BASE }); return res.end(); }
    if (!url.startsWith(BASE)) { res.writeHead(404); return res.end('Not found'); }
    let rel = url.slice(BASE.length) || 'index.html';
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT) || /(^|\/)(node_modules|\.git)(\/|$)/.test(rel)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
}

function start(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(port || 0, '127.0.0.1', () => resolve({ server: srv, port: srv.address().port, url: 'http://127.0.0.1:' + srv.address().port + BASE }));
  });
}

module.exports = { start, BASE };

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  start(port).then(({ url }) => console.log('Serving at ' + url));
}
