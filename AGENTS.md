# Agents & MCP (Source of Truth)

This document defines how agents coordinate on this project, using an MCP-like event stream and a local fallback mirror.

## Quick Start

- Env vars:
  - REACT_APP_MCP_URL, REACT_APP_MCP_API_KEY (client in app)
  - MCP_PORT / MCP_API_KEY (server/tasks)
- Client usage (in-app): `src/shared/agents/mcpClient.js`
  - connect() → subscribe(["tasks.*"]) → sendHeartbeat / requestLock / updateStatus
- Fallback mirror (if MCP unavailable):
  - context/state.json (latest status/locks)
  - context/events.jsonl (append-only events)
  - context/tasks.yaml (todos/bugs) and context/CHANGELOG.log (breaking changes)
  - CLI: `npm run mcp-task -- open-task "…"` (see scripts/mcp-task.js)

## Topics & Contracts

- tasks.heartbeat: { task_id, branch, sha, focus[], locks[], timestamp, eta?, blocked_on? }
- tasks.lock.request → tasks.lock.granted | tasks.lock.denied: { task_id, paths[], ttl_sec }
- tasks.status.update: { task_id, status: in_progress|blocked|review|done, note }
- tasks.plan.updated: { task_id, plan_path, sha, sections[] }
- tasks.breaking_change: { task_id, summary, impacted_paths[], pr?, migration? }
- tasks.pr.opened: { task_id, pr, sha }
- tasks.todo.open|update|close: { id, title, status, links? }
- bugs.open|update|close: { id, title, severity, paths, links? }
- tasks.linked: { task_id, refs[] }
- tasks.note: { task_id, note }

Server-side reference: `server/mcp-tasks.js`. Client helper: `src/shared/agents/mcpClient.js`. Details in `docs/mcp.md`.

## Policies

- Heartbeat every 60s; lock TTL ~180s. Stale heartbeats can auto-release locks.
- Lock before renames/moves of public modules (e.g. features/* barrels).
- Keep UI/data test selectors stable (`data-test` attributes) during refactors.
- Document public API/ABI changes in docs/project.mdc and open an ADR when needed.
- Use small PRs; prefix commits by task (e.g., [REF-001], [VOICE-003]; add [BREAKING] if applicable).

## File Map

- Primary docs index: `docs/index.md`
- MCP details: `docs/mcp.md` (this file is the high-level entry point)
- Coordination history: `CC/` (historical or in-progress notes)
- Fallback mirror: `context/` (state/events/tasks/changelog)

## Conventions

- Todos/Bugs: open via MCP; mirror to `context/tasks.yaml` when offline.
- Breaking changes: emit `tasks.breaking_change` and append a brief entry to `context/CHANGELOG.log`.
- Refactor phases: track in `docs/refactor-plan.md` and outcome in `docs/project.mdc`.

