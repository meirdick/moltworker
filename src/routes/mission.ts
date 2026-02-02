import { Hono } from 'hono';
import type { AppEnv } from '../types';

/**
 * Mission Control Dashboard routes
 * Serves the Mission Control SPA from the ASSETS binding at /mission/.
 * The dashboard is a separate React + Convex app that talks directly to Convex.
 *
 * Note: Static assets (/mission/assets/*) are handled by publicRoutes.
 * Auth is applied centrally in index.ts before this app is mounted.
 */
const mission = new Hono<AppEnv>();

// Serve index.html for all mission routes (SPA)
mission.get('*', async (c) => {
  const url = new URL(c.req.url);
  return c.env.ASSETS.fetch(new Request(new URL('/mission/index.html', url.origin).toString()));
});

export { mission };
