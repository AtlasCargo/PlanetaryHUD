#!/usr/bin/env node
// Robust CRA client starter: picks a free port (prefers CLIENT_PORT or PORT),
// sets BROWSER=none, and spawns react-scripts start with inherited stdio.
// Avoids interactive port prompts that can hang concurrent startup.

const net = require('net');
const { spawn } = require('child_process');

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '0.0.0.0');
  });
}

async function findFreePort(preferred, start, end) {
  if (preferred) {
    // Try preferred first
    if (await isPortFree(preferred)) return preferred;
  }
  const min = Number(start) || 3000;
  const max = Number(end) || min + 50;
  for (let p = min; p <= max; p += 1) {
    // Skip preferred if in range and already tried
    if (preferred && p === Number(preferred)) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free port found in range ${min}-${max}`);
}

(async () => {
  const preferred = Number(process.env.CLIENT_PORT || process.env.PORT || 3001);
  const port = await findFreePort(preferred, 3000, 3050);
  const env = { ...process.env, PORT: String(port), BROWSER: process.env.BROWSER || 'none', PORT_API: process.env.PORT_API };
  console.log(`[client] Using PORT=${env.PORT}`);
  // Ensure server health is ready before starting client to avoid proxy/setup timing stalls
  const http = require('http');
  const MAX_WAIT_MS = 15000;
  const START = Date.now();
  const waitForHealth = () => new Promise((resolve) => {
    const tryOnce = () => {
      http.get({ host: '127.0.0.1', port: Number(process.env.PORT_API || 5999), path: '/api/health', timeout: 2000 }, (res) => {
        if (res.statusCode === 200) return resolve();
        if (Date.now() - START > MAX_WAIT_MS) return resolve();
        setTimeout(tryOnce, 500);
      }).on('error', () => {
        if (Date.now() - START > MAX_WAIT_MS) return resolve();
        setTimeout(tryOnce, 500);
      });
    };
    tryOnce();
  });

  await waitForHealth();
  const child = spawn('node', ['node_modules/react-scripts/scripts/start.js'], { stdio: 'inherit', env });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code || 0);
  });
})().catch((err) => {
  console.error('[client] Failed to start:', err && err.message ? err.message : err);
  process.exit(1);
});


