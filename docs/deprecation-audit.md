# Deprecation Audit (Work-in-Progress)

Track candidates for removal once confirmed unused.

- src/components/RGE2.jsx — verify usage; deprecate if redundant with Globe.
- setupProxy.js (root) vs src/setupProxy.js — keep one.
- src/services/worldBankApi.ts vs src/services/worldBankApi.js — keep one.
- Avatar/rigging state — behind feature flag or remove if unused.
- Effects/components: GlowOverlay, ScannerEffect, ParticlesBackground — confirm usage.
- Data duplication: build/data/ vs public/data/ — serve from public/.
- postcss.cfig.js — confirm/rename to postcss.config.js or remove.
- server/server/ duplication — consolidate into server/.
- src/services/supabaseClient.js — verify usage.

Add findings and decisions per phase.
