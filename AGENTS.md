# AGENTS Development Guide

This file provides conventions and commands for automated agents and human contributors working on this repository.

## Code Style

- **React Components**: Implement as functional components using React hooks.
- **Naming Conventions**:
  - Components use **PascalCase**.
  - Functions and variables use **camelCase**.
- **File Extensions**:
  - React components use the `.jsx` extension.
  - Utilities and non‑component files use `.js`.
- **Indentation**: Two spaces per indentation level.
- **State Management**: Prefer local state via `useState`. Use `useRef` for DOM references.

## Important Scripts

Run commands with `yarn`:

- `yarn install` – install dependencies.
- `yarn start` – launch the development server.
- `yarn build` – build the application for production (uses `react-scripts build`).

## Testing Instructions

This project does not include automated tests yet. If tests are added, update `package.json` with an appropriate test script (e.g. `yarn test`) and ensure it is executed in CI before merging changes.
