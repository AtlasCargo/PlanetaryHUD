// Minimal MCP Tasks Server (WebSocket-based)
// - Auth: per-message apiKey field must match process.env.MCP_API_KEY (or --apiKey)
// - Topics: clients send { type: 'subscribe', payload: { topics: ['tasks.*'] } }
// - Events handled: tasks.heartbeat, tasks.status.update, tasks.lock.request,
//                   tasks.plan.updated, tasks.breaking_change, tasks.pr.opened
// - Persists: context/state.json (heartbeats/status/locks), context/events.jsonl (append-only)
// - Broadcasts: events to subscribers whose topic globs match the event type

const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// --- Config ---
const PORT = Number(process.env.MCP_PORT || process.env.PORT_MCP || 7071);
const API_KEY = process.env.MCP_API_KEY || process.env.MCP_SERVER_API_KEY || process.argv.find(a => a.startsWith('--apiKey='))?.split('=')[1] || '';
const DATA_DIR = path.join(__dirname, '..', 'context');
const STATE_PATH = path.join(DATA_DIR, 'state.json');
const EVENTS_PATH = path.join(DATA_DIR, 'events.jsonl');

// Ensure data dir exists
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STATE_PATH)) fs.writeFileSync(STATE_PATH, JSON.stringify({ tasks: {}, locks: [], updatedAt: new Date().toISOString() }, null, 2));
if (!fs.existsSync(EVENTS_PATH)) fs.writeFileSync(EVENTS_PATH, '');

// --- State ---
const state = {
  // tasks: { [task_id]: { heartbeat: {...}, status: 'in_progress', sha, branch } }
  tasks: {},
  // locks: [{ paths: ['glob'], task_id, grantedAt, ttl_sec }]
  locks: [],
  updatedAt: new Date().toISOString(),
};

// Load existing state
try {
  const loaded = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  if (loaded && typeof loaded === 'object') {
    state.tasks = loaded.tasks || {};
    state.locks = loaded.locks || [];
    state.updatedAt = loaded.updatedAt || state.updatedAt;
  }
} catch {}

function persistState() {
  state.updatedAt = new Date().toISOString();
  try { fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2)); } catch {}
}

function appendEvent(evt) {
  try { fs.appendFileSync(EVENTS_PATH, JSON.stringify({ ts: Date.now(), ...evt }) + '\n'); } catch {}
}

// Simple glob match for topics like "tasks.*"
function topicMatches(pattern, type) {
  if (!pattern) return false;
  if (pattern === type) return true;
  if (pattern.endsWith('.*')) {
    const base = pattern.slice(0, -2);
    return type === base || type.startsWith(base + '.');
  }
  return false;
}

// Simple path glob matcher for locks (supports ** and *)
function pathMatchesGlob(filePath, glob) {
  // Normalize to forward slashes
  const p = filePath.replace(/\\/g, '/');
  const g = glob.replace(/\\/g, '/');
  // Escape regex special chars except *
  const esc = s => s.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
  let rx = esc(g)
    .replace(/\\\\\*\\\\\*/g, '.*') // ** -> .*
    .replace(/\\\\\*/g, '[^/]*');      // *  -> [^/]*
  const re = new RegExp('^' + rx + '$');
  return re.test(p);
}

function hasConflict(paths, taskId) {
  return state.locks.some(lock =>
    lock.task_id !== taskId && lock.paths.some(lp => paths.some(p => pathMatchesGlob(p, lp) || pathMatchesGlob(lp, p)))
  );
}

function pruneLocks() {
  const now = Date.now();
  const before = state.locks.length;
  state.locks = state.locks.filter(l => (now - l.grantedAt) < (1000 * (l.ttl_sec || 180)));
  if (state.locks.length !== before) persistState();
}

setInterval(pruneLocks, 10_000);

// --- WebSocket Server ---
const wss = new WebSocketServer({ port: PORT });
console.log(`[MCP] Tasks server listening on ws://localhost:${PORT}`);

const clients = new Set();

function send(ws, msg) {
  try { ws.send(JSON.stringify(msg)); } catch {}
}

function broadcast(type, payload) {
  const evt = { type, payload };
  for (const c of clients) {
    const subs = c.subscriptions || [];
    if (subs.some(s => topicMatches(s, type))) send(c.ws, evt);
  }
}

function requireAuth(msg) {
  // Accept apiKey at top-level or inside payload for client flexibility
  const key = msg?.apiKey || msg?.payload?.apiKey;
  return !API_KEY || (key && key === API_KEY);
}

wss.on('connection', (ws) => {
  const client = { ws, subscriptions: [] };
  clients.add(client);
  ws.on('close', () => clients.delete(client));
  ws.on('message', (data) => {
    let msg = {};
    try { msg = JSON.parse(String(data)); } catch { return; }
    const { type, payload } = msg || {};
    if (!type) return;

    if (!requireAuth(msg)) {
      return send(ws, { type: 'auth.denied', payload: { reason: 'Invalid API key' } });
    }

    if (type === 'subscribe') {
      const topics = Array.isArray(payload?.topics) ? payload.topics : [];
      client.subscriptions = topics;
      return send(ws, { type: 'subscribe.ok', payload: { topics } });
    }

    // Route tasks.*
    switch (type) {
      case 'tasks.heartbeat': {
        const hb = { ...payload };
        const id = hb.task_id || 'unknown';
        state.tasks[id] = state.tasks[id] || {};
        state.tasks[id].heartbeat = hb;
        if (hb.sha) state.tasks[id].sha = hb.sha;
        if (hb.branch) state.tasks[id].branch = hb.branch;
        persistState();
        appendEvent({ type, payload: hb });
        broadcast(type, hb);
        break;
      }
      case 'tasks.status.update': {
        const upd = { ...payload };
        const id = upd.task_id || 'unknown';
        state.tasks[id] = state.tasks[id] || {};
        state.tasks[id].status = upd.status || state.tasks[id].status || 'in_progress';
        state.tasks[id].note = upd.note || '';
        persistState();
        appendEvent({ type, payload: upd });
        broadcast(type, upd);
        break;
      }
      case 'tasks.lock.request': {
        const req = { ...payload };
        const id = req.task_id || 'unknown';
        const paths = Array.isArray(req.paths) ? req.paths : [];
        const ttl_sec = Number(req.ttl_sec || 180);
        let granted = false;
        if (!paths.length) {
          granted = false;
        } else if (hasConflict(paths, id)) {
          granted = false;
        } else {
          state.locks.push({ task_id: id, paths, grantedAt: Date.now(), ttl_sec });
          persistState();
          granted = true;
        }
        const respType = granted ? 'tasks.lock.granted' : 'tasks.lock.denied';
        const payloadOut = { task_id: id, paths, ttl_sec };
        appendEvent({ type: respType, payload: payloadOut });
        // Reply only to requester
        send(ws, { type: respType, payload: payloadOut });
        // And broadcast stateful change
        if (granted) broadcast('tasks.lock.changed', { task_id: id, paths, ttl_sec });
        break;
      }
      case 'tasks.plan.updated':
      case 'tasks.breaking_change':
      case 'tasks.pr.opened': {
        const evt = { ...payload };
        appendEvent({ type, payload: evt });
        broadcast(type, evt);
        break;
      }
      default:
        // Ignore unknown types; optionally log
        break;
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => { try { wss.close(); } catch {} process.exit(0); });
