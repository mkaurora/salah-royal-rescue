/* Tiny static server that mounts this folder at /salah-royal-rescue/learn/ (like GitHub Pages). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = '/salah-royal-rescue/learn/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.mp3': 'audio/mpeg'
};

let testBuild = 0;
function setTestBuild(n) { testBuild = n; }

function createServer() {
  return http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/' || url === '/salah-royal-rescue/learn') { res.writeHead(302, { Location: BASE }); return res.end(); }
    if (!url.startsWith(BASE)) { res.writeHead(404); return res.end('Not found'); }
    let rel = url.slice(BASE.length) || 'index.html';
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT) || /(^|\/)(node_modules|\.git)(\/|$)/.test(rel)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      // e2e "new deploy": a changed sw.js BUILD stamp and a marker in index.html
      if (testBuild && rel === 'sw.js') data = Buffer.from(String(data).replace(/var BUILD = '[^']*';/, "var BUILD = 'test" + testBuild + "';").replace(/var VERSION = '[^']*';/, "var VERSION = '9." + testBuild + "';"));
      if (testBuild && rel === 'index.html') data = Buffer.from(String(data).replace('<head>', '<head><meta name="test-build" content="' + testBuild + '">'));
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

module.exports = { start, BASE, setTestBuild };

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  start(port).then(({ url }) => console.log('Serving at ' + url));
}
