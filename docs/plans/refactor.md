# HUD Core Refactor (REF-001)

Plan of record for the ongoing HUD refactor.

- Scope: improve structure, maintain behavior stability, stage for new features.
- Owner: agent:refactor
- Branch: feature/refactor-hud-core

References
- Previous notes: ../refactor-plan.md

Checklist
- Extract LeftSidebar
- Extract SettingsPanel
- Extract IdeologramPanel
- Maintain public interfaces (exports, routes, IPC, config keys)

Risks
- API/ABI drift across modules; mitigate via re-exports and small PRs.

