// scripts/dev.js
// Simple dev runner to start server and CRA concurrently with clean output and signal handling.

const { spawn } = require('child_process');

function run(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  p.on('exit', (code) => {
    if (code != null) process.exitCode = code;
  });
  return p;
}

const server = run('node', ['server/index.js']);

// Optional: basic health wait is omitted to keep it dependency-free.
// Start CRA shortly after server spawn.
setTimeout(() => {
  run('react-scripts', ['start']);
}, 300);

function shutdown() {
  try { server && server.kill('SIGINT'); } catch {}
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

