# Ideologram

Analyze an individual's ideological profile from two sources: their books (e.g., Goodreads export) and a short quiz. Output is an "ideologram": a vector in a low-dimensional space plus an amplitude indicating strength/coherence.

Status: Planning. See `docs/` for specifications and plan.

## What it does
- Import rated books (CSV export) and infer ideological tendencies.
- Offer a lightweight, non-leading quiz to enrich or substitute book-based signal.
- Combine signals into a vector (dimensions) and an amplitude (strength + consistency) with confidence.
- Provide a React widget and headless APIs for easy integration into existing apps.

## Integration (planned)
- React (recommended):
  ```tsx
  import { IdeologramWidget } from '@ideologram/widget';

  <IdeologramWidget
    mode="both"                       // 'books' | 'quiz' | 'both'
    onComplete={(result) => console.log(result)}
    theme={{ primary: '#4f46e5' }}
  />
  ```
- Web component (no React):
  ```html
  <script src="https://cdn.example.com/ideologram-widget.js"></script>
  <ideologram-widget mode="quiz"></ideologram-widget>
  ```
- Headless compute (browser or server):
  ```ts
  import { computeIdeologram } from '@ideologram/core';
  const result = computeIdeologram({ books, quizResponses });
  ```

Schemas for results and book mappings are in `docs/schemas/`.

## Architecture (high level)
- Client-first: all computation can run in-browser for privacy.
- Optional API provides curated book vectors and better title-to-ID resolution.
- Source-available mapping of representative books to ideological dimensions.

## Roadmap
- v0.1 Docs + schemas + sample anchors
- v0.2 Headless core (TS) + CSV importer + basic quiz
- v0.3 React widget + theming + shareable result card
- v0.4 Curated book database + resolver API
- v0.5 Embedding-backed auto-tagging pipeline

## Ethics & Privacy
- Client-side by default; no data leaves the browser unless user opts in.
- Transparent scoring and explainability (dimension-by-dimension).
- Users can review/edit imported items before scoring.

See `docs/` for details and the implementation plan.
