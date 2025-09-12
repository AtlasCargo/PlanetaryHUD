MCP Extensions (PlanetaryHUD)

Event Topics
- tasks.heartbeat { task_id, branch, sha, focus[], locks[], timestamp, eta, blocked_on }
- tasks.status.update { task_id, status: in_progress|blocked|review|done, note }
- tasks.lock.request { task_id, paths[] } -> expect tasks.lock.granted|denied { task_id, paths[], ttl_sec }
- tasks.plan.updated { task_id, plan_path, sha, sections[] }
- tasks.breaking_change { task_id, summary, impacted_paths[], pr, migration }
- tasks.pr.opened { task_id, pr, sha }

New: To-dos and Bugs
- tasks.todo.open { id, title, description, labels[], paths[], assignees[], priority, created_at }
- tasks.todo.update { id, title?, description?, labels?, paths?, assignees?, priority?, status? }
- tasks.todo.close { id, resolution }
- bugs.open { id, title, repro, env, severity, paths[], created_at }
- bugs.update { id, title?, repro?, env?, severity?, status?, links? }
- bugs.close { id, resolution }
- tasks.linked { task_id, refs: [ BUG-123, PR#45 ] }
- tasks.note { task_id, note }

Fallback (offline)
- Mirror events to context/tasks.yaml (open tasks and bugs)
- Append to context/CHANGELOG.log lines: ISO8601 | type | id | summary

Policies
- Heartbeat every 60s; TTL 120s for locks
- Commit prefixes: [TASK-xx] or [BUG-xx]; add [BREAKING] when applicable
- Update ADRs for API/ABI/protocol changes

