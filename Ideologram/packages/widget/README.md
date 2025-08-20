# @ideologram/widget

React widget to compute and display an ideologram using `@ideologram/core`.

## Install
- In this monorepo, run from root: `npm install` then `npm run build`.
- In another app:
```bash
npm i @ideologram/widget @ideologram/core react react-dom
```

## Usage
```tsx
import { IdeologramWidget } from '@ideologram/widget';

<IdeologramWidget
  mode="both"
  books={[{ title: 'Atlas Shrugged', rating: 5 }, { title: 'The Communist Manifesto', rating: 1 }]}
  quizResponses={[]}
  onComplete={(r) => console.log(r)}
/>
```

- Pass `books` (optional) and/or `quizResponses` (optional).
- Use `anchors` to override the default sample anchors.
- Use `theme={{ primary: '#4f46e5' }}` to customize color.

## API
- Component: `IdeologramWidget`
- Hook: `useIdeologram()` for headless control inside your own UI.
