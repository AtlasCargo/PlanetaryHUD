# API & Integration

## React widget (planned)
- Component: `IdeologramWidget`
  - Props: `mode` ('books' | 'quiz' | 'both'), `onComplete(result)`, `theme`, `initialBooks?`, `dimensions?`.
  - Events: `onError`, `onProgress`.
- Hook: `useIdeologram()` returns `{ compute, importing, result, error }`.
- Headless core: `computeIdeologram({ books, quizResponses, options })`.

## Data types (TS)
- BookInput: `{ title: string; author?: string; rating?: number; isbn?: string; year?: number }`
- IdeologyVector: see `docs/schemas/vector.schema.json`.

## Optional API endpoints
- POST `/v1/compute` → IdeologyVector (if you want server compute)
- POST `/v1/resolve-books` → [{ input, match, score }]
- POST `/v1/ingest/goodreads-csv` → parsed normalized books
- GET `/v1/dimensions` → dimension metadata
- POST `/v1/scores` → upsert lexical score for a book by ISBN/key
  - Body: `{ id?, isbn?, title?, author?, source, method, reliability, metrics, axes, termHits, axisTermContribs, metricTermContribs }`
  - Returns: `{ ok: true, key }`
- GET `/v1/scores/:key` → fetch stored score by ISBN/key
- GET `/v1/scores` → list all stored scores

## User library & enrichment
- POST `/v1/users/:userId/library` → save normalized library (e.g., Goodreads CSV parsed)
- GET `/v1/users/:userId/library` → fetch
- POST `/v1/users/:userId/enriched` → save enriched items (Open Library/Wikidata topics etc.)
- GET `/v1/users/:userId/enriched` → fetch
- POST `/v1/users/:userId/scores` → attach score entries to a user
- GET `/v1/users/:userId/scores` → list user scores
- GET `/v1/users/:userId/fs` → pseudo-filesystem tree for browsing user's stored data

## Theming & embedding
- CSS variables for colors/spacing; unstyled/headless mode for full control.
- Web component build for non-React apps.

## Versioning
- Semantic versioning; JSON schemas for inputs/outputs to keep compatibility.
