import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
const DIST = join(import.meta.dirname, 'dist');
const PORT = 3001;
const GATEWAY_PORT = process.env.CLAWDBOT_GATEWAY_PORT || 18789;
const AUTH_TOKEN = process.env.MISSION_AUTH_TOKEN || '';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveFile(res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return false;
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
  return true;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // /mission routes — serve dashboard
  if (path.startsWith('/mission')) {
    // Simple auth check via cookie or query param
    const token = url.searchParams.get('token') || parseCookie(req.headers.cookie, 'mc_token');
    if (AUTH_TOKEN && token !== AUTH_TOKEN) {
      // Check if it's the initial auth request
      if (url.searchParams.has('token') && token === AUTH_TOKEN) {
        // Set cookie and redirect
        res.writeHead(302, {
          'Set-Cookie': `mc_token=${AUTH_TOKEN}; Path=/mission; HttpOnly; SameSite=Strict; Max-Age=86400`,
          'Location': '/mission/',
        });
        res.end();
        return;
      }
      if (AUTH_TOKEN && token !== AUTH_TOKEN) {
        res.writeHead(401, { 'Content-Type': 'text/html' });
        res.end('<h2>Mission Control</h2><p>Unauthorized. Append ?token=YOUR_TOKEN to authenticate.</p>');
        return;
      }
    }

    // Set auth cookie on first valid token access
    if (url.searchParams.has('token') && token === AUTH_TOKEN) {
      res.writeHead(302, {
        'Set-Cookie': `mc_token=${AUTH_TOKEN}; Path=/mission; HttpOnly; SameSite=Strict; Max-Age=86400`,
        'Location': '/mission/',
      });
      res.end();
      return;
    }

    // Strip /mission prefix and serve static files
    let filePath = path.replace(/^\/mission\/?/, '') || 'index.html';
    if (!filePath || filePath === '') filePath = 'index.html';

    const fullPath = join(DIST, filePath);
    if (!serveFile(res, fullPath)) {
      // SPA fallback — serve index.html for client-side routing
      serveFile(res, join(DIST, 'index.html'));
    }
    return;
  }

  // Everything else — 404 or could proxy to gateway
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mission Control dashboard running at http://0.0.0.0:${PORT}/mission/`);
  if (AUTH_TOKEN) console.log(`Auth enabled — use ?token=<token> to authenticate`);
  else console.log(`⚠ No AUTH_TOKEN set — dashboard is open`);
});
