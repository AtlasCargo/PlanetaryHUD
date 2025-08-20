# Implementation Plan

## Phase 0 — Planning (this PR)
- Docs, schemas, example anchors. Define axes and scoring. DONE when README and docs exist.

## Phase 1 — Core (Headless, TS)
- `@ideologram/core`: book CSV parser (Goodreads), Open Library resolver, quiz engine, scoring.
- Unit tests and JSON schema validation.

## Phase 2 — Widget (React)
- `@ideologram/widget`: upload UI, quiz UI, results card, theming, accessibility.
- Headless mode + hook API.

## Phase 3 — Demo App
- Minimal Next.js app to showcase flows; no auth.

## Phase 4 — Curated Data & API
- Anchor dataset (books → vectors) with citations; lightweight Fastify API for resolution.

## Phase 5 — Embeddings Pipeline
- Map book descriptions to axes using a linear probe over text embeddings; human-in-the-loop review.

## Quality
- Telemetry off by default. 
- Accessibility: WCAG AA. 
- i18n-ready strings.

## Milestones
- v0.1: ship docs + schemas + sample CSV
- v0.2: compute core + CSV import + basic quiz
- v0.3: React widget + result sharing
- v0.4: curated dataset + resolver API
- v0.5: embeddings + calibration

## Recent additions
- Open Library + Wikidata enrichment utilities (subjects → axis hints) [done]
- Lexical analyzer for text/EPUB with metrics and per-term contributions [done]
- Demo EPUB upload and analysis UI [done]
- Scores API (JSON) and auto-save from demo with method and reliability metadata [done]

## Scores persistence
- API: POST `/v1/scores` (upsert by ISBN/key), GET `/v1/scores/:key`, GET `/v1/scores`
- Storage: JSON file initially; later upgrade to SQLite
- Schema: `docs/schemas/score.schema.json`
- Metadata per score: `method` (e.g., `lexical-v1`), `reliability` in [0,1], timestamps
