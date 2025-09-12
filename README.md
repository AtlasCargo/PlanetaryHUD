# PlanetaryHUD

Futuristic globe visualization with Ideologram analytics and modular HUD.

## Quickstart

- Install: `npm i`
- Dev: `npm run dev` (server 5999 + client auto-ports; proxy on /api)
- Env (optional): `REACT_APP_MCP_URL`, `REACT_APP_MCP_API_KEY`

## Key Routes

- `/` home (globe)
- `/chat` chat view
- `/ideologram` ideologram composer
- `/settings` account/settings
- `/avatar-rig` avatar rig panel

## Docs

- Main index: `docs/index.md`
- Agents & MCP: `AGENTS.md`
- Refactor outcomes: `docs/project.mdc`
- Contributing: `docs/CONTRIBUTING.md`

## Dev Notes

- Auto-rotation defaults ON (persisted in localStorage).
- Tooltips are clamped to the center pane and below the top HUD.
- Dataset selection/reset logic in `features/datasets/useDatasetSelection`.

