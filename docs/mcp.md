MCP Tasks Server (v0)

Summary
- WebSocket tasks server for multi-agent coordination (heartbeats, locks, status, PRs).
- Clients subscribe to topics (e.g., `tasks.*`) and publish events with an `apiKey`.
- State is persisted in `context/state.json`; events are appended to `context/events.jsonl`.

Run
- env:
  - `MCP_PORT` (default `7071`)
  - `MCP_API_KEY` (required for auth)
- start:
  - `npm run start-mcp`
  - or `node server/mcp-tasks.js`

Client Env
- In React app, set:
  - `REACT_APP_MCP_URL=ws://localhost:7071`
  - `REACT_APP_MCP_API_KEY=<your key>`

Client Usage (browser)
```
import createMcpClient from 'src/shared/agents/mcpClient';
const client = createMcpClient({ url: process.env.REACT_APP_MCP_URL, apiKey: process.env.REACT_APP_MCP_API_KEY });
await client.connect();
client.subscribe(['tasks.*']);
client.sendHeartbeat({ task_id: 'REF-001', branch: 'feature/refactor-hud-core', sha: '...', focus: ['src/hud/**'], locks: ['src/hud/core/**'], timestamp: new Date().toISOString() });
```

Event Types (publish)
- `tasks.heartbeat`: { task_id, branch, sha, focus[], locks[], timestamp, eta?, blocked_on?, apiKey }
- `tasks.status.update`: { task_id, status, note?, apiKey }
- `tasks.lock.request`: { task_id, paths[], ttl_sec?, apiKey }
- `tasks.plan.updated`: { task_id, plan_path, sha, sections[]?, apiKey }
- `tasks.breaking_change`: { task_id, summary, impacted_paths[], pr?, migration?, apiKey }
- `tasks.pr.opened`: { task_id, pr, sha, apiKey }

Event Types (receive)
- `subscribe.ok`: { topics[] }
- `auth.denied`: { reason }
- `tasks.lock.granted`: { task_id, paths[], ttl_sec }
- `tasks.lock.denied`: { task_id, paths[] }
- `tasks.lock.changed`: { task_id, paths[], ttl_sec }
- Broadcast of all published `tasks.*` events per subscriptions.

State Files
- `context/state.json`: latest heartbeats, statuses, and active locks (with TTLs).
- `context/events.jsonl`: newline-delimited event log for audit/debug.
- `context/tasks.yaml`: human-readable registry of tasks (seeded with REF-001, VOICE-003).

Notes
- Locks auto-expire after TTL (default 180s) if heartbeats stop.
- The server checks `payload.apiKey` on every message; set the same key in both agents.

