// Reverse proxy: sits on port 18790, routes /mission/* to dashboard, everything else to gateway
import { createServer, request as httpRequest } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const DIST = join(import.meta.dirname, 'dist');
const GATEWAY_PORT = process.env.CLAWDBOT_GATEWAY_PORT || 18789;
const PROXY_PORT = parseInt(process.env.MISSION_PROXY_PORT || GATEWAY_PORT);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStatic(res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return false;
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
  return true;
}

function proxyToGateway(req, res) {
  const opts = {
    hostname: '127.0.0.1',
    port: GATEWAY_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxy = httpRequest(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxy.on('error', (e) => {
    res.writeHead(502);
    res.end('Gateway unavailable');
  });
  req.pipe(proxy, { end: true });
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PROXY_PORT}`);
  const path = url.pathname;

  // Dashboard routes
  if (path.startsWith('/mission')) {
    let filePath = path.replace(/^\/mission\/?/, '') || 'index.html';
    if (!filePath || filePath === '') filePath = 'index.html';
    const fullPath = join(DIST, filePath);
    if (!serveStatic(res, fullPath)) {
      // SPA fallback
      serveStatic(res, join(DIST, 'index.html'));
    }
    return;
  }

  // Everything else → gateway
  proxyToGateway(req, res);
});

// Also handle WebSocket upgrades → gateway
server.on('upgrade', (req, socket, head) => {
  const opts = {
    hostname: '127.0.0.1',
    port: GATEWAY_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxy = httpRequest(opts);
  proxy.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/1.1 ${proxyRes.statusCode || 101} ${proxyRes.statusMessage || 'Switching Protocols'}\r\n` +
      Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
      '\r\n\r\n'
    );
    if (proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxy.on('error', () => socket.destroy());
  proxy.end();
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Mission Control proxy running on :${PROXY_PORT}`);
  console.log(`  /mission/* → dashboard (static)`);
  console.log(`  everything else → gateway (:${GATEWAY_PORT})`);
});
