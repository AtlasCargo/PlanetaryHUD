# Contributing

This project uses a modular, feature-sliced structure with a thin composer (src/components/ReactGlobeExample.jsx alias Main.jsx). Keep features isolated and use shared contexts and the event bus for cross-feature interactions.

- Branch naming: feature/<short-purpose>
- Commit prefixes: [REF-001] for refactor, [VOICE-003] for voice work; add [BREAKING] when applicable.
- MCP: If REACT_APP_MCP_URL and REACT_APP_MCP_API_KEY are set, the app sends heartbeats and lock requests. When MCP is unavailable, mirror to context/tasks.yaml and append to context/CHANGELOG.log.
- UI contracts: Preserve routes, public module paths, CSS classes, and data-testids. Add re-exports when moving modules.

## Development
- Start: npm start
- Lint: npm run lint
- Tasks/Bugs fallback: npm run mcp-task -- open-task "title" or open-bug.

## Feature guidelines
- Extract concerns into src/features/<domain>; keep composer components small.
- Use contexts in src/contexts/* and the event bus in src/shared/events/* for cross-feature state.
- Add Error Boundaries to heavy/lazy sections.

### Public contracts and barrels
- Preserve public import paths when moving files. If refactoring, create a barrel (`index.js`/`index.ts`) to re-export moved symbols to avoid churn.
- Example: Ideologram enrichment now lives under `src/features/ideologram/enrichment/`; import from the directory barrel rather than deep files.
- Keep event names stable (see `src/shared/events/contracts.js`). If you must rename or add, document the change and update tests.

### Mode gating rules
- Home: renders globe and HUD; dataset controls and reset are visible when globe is ready.
- Settings: render inline in the center pane via `SettingsGearContainer`; hide globe and bottom HUD.
- Avatar: render `AvatarRigPanel` in center; hide globe and bottom HUD.

## Docs
- Update docs/project.mdc and add ADRs for public API/ABI changes.
- Keep docs/index.md updated with links to active areas.
 - When making structural refactors, add a brief note to `docs/project.mdc` under Refactor Notes and update the Mode Gating Contract section if relevant.
