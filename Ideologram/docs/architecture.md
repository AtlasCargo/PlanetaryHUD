# Architecture

## Components
- Core (TS): Pure functions for parsing and scoring. Runs in browser or Node.
- Widget (React): UI for import, quiz, results. Optional web component build.
- API (optional): Fastify/Express for book resolution and curated dataset delivery.
- Data: CSV/JSON anchors for books → axis vectors; versioned and auditable.

## Data flow
- Client imports data → normalization → resolve book IDs → compute vector → display with explanations.
- Optional: call API for better title resolution and updated anchors.

## Tech choices
- TypeScript + Vite for libs; React 18+; Tailwind (optional) or headless UI.
- Node 20+ for tooling; Fastify for API.
- Open Library for lookup; no Goodreads API dependency.

## Packaging
- Monorepo (npm workspaces): `packages/core`, `packages/widget`, `apps/demo`, `services/api`.
- Publish `@ideologram/core` + `@ideologram/widget`.
