# Refactor Plan: PlanetaryHUD

This document tracks the phased refactor to modularize the app for safe, incremental delivery.

## Goals
- Decompose the monolithic `ReactGlobeExample.jsx` into feature slices with clear contracts.
- Enable parallel work across globe, datasets, UI/FX, chat, finance, and ideologram features.
- Maintain functionality after each phase with small, testable steps.

## Phases (High-Level)
0. Scaffolding: shared events bus, folder structure, docs — DONE
1. LayoutShell extracted (uses `useLayoutState`) — DONE
2. TooltipLayer extracted and event-wired — DONE
3. GlobeController created; globe state/hover moved — DONE
4. DatasetController; normalized series and filters — IN PROGRESS
   - 4a: Introduced `features/datasets/api` and swapped calls — DONE
   - 4b: Added `DatasetProvider` and `DatasetSelector`; mapped provider series/years to globe state; synced year sliders with provider — DONE
   - 4c: Move remaining dataset-specific local state to provider; have globe/graph consume provider directly — IN PROGRESS
5. Color strategies per dataset
6. GraphPanel bound to dataset controller
7. FX toggles persistent
8. ChatPanel + state
9. FinancePanel integration
10. IdeologramPanel + state
11. Theme tokens
12. Modes → optional routes
13. Cleanup/deprecations
14. Documentation updates

Each phase ends with a build + manual smoke test and zero runtime regressions.


