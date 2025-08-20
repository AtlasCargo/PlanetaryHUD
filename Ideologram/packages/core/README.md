# @ideologram/core

Headless TypeScript library to compute an ideologram (ideology vector + amplitude + confidence) from books and/or quiz responses.

## Install
- Monorepo: already included. In your own project:
```bash
npm i @ideologram/core
```

## Usage
```ts
import { computeIdeologram, SAMPLE_ANCHORS } from '@ideologram/core';

const result = computeIdeologram({
  books: [
    { title: 'The Road to Serfdom', rating: 5, representative: 1, year: 2020 },
    { title: 'The Communist Manifesto', rating: 1, representative: 1 },
  ],
  anchors: SAMPLE_ANCHORS,
});

console.log(result.dimensions, result.amplitude, result.confidence);
```

## Types
- `BookInput`, `BookAnchor`, `IdeologyVector`, `DimensionKey`

## Notes
- All compute is deterministic and pure. Safe for browser or Node.
- Anchors can be swapped with your own mapping dataset.
