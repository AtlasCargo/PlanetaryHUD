# Coordination Contract: Voice Integration x Refactor

Purpose: Provide stable interfaces and flags so the ongoing refactor and the new voice features (Realtime + Transcribe + Corrections) can proceed in parallel without collisions. Update this doc after reviewing the refactor plan in `docs/` and `Ideologram/docs`.

## Refactor Alignment

Phases per docs/refactor-plan.md and how voice work threads in:
- P0 Shared bus, folders, docs: define voice event names now (no UI wiring).
- P1–P7 Layout/Globe/Datasets: no direct changes; keep voice behind flags.
- P8 ChatPanel + state: integrate voice slice and buttons here; emit/consume bus events.
- P12 Modes → routes: optionally expose a Voice/Unified route or toggle.
- P13+ Cleanup/Docs: fold in finalized contracts.

Event bus: reuse `src/shared/events/contracts.js`. Additions listed below; do not mutate until refactor owner approves.

## Feature Flags

- VOICE_REALTIME: enable Live (Realtime) button and plumbing.
- VOICE_TRANSCRIBE: enable Transcribe button and upload flow.
- VOICE_CONF_WORD: enable word-level confidence rendering.
- VOICE_CONF_SYLLABLE: enable derived syllable-level confidence.
- VOICE_CORRECTION: enable second-pass correction pipeline.
- VOICE_UNIFIED_MODE: enable single-button hybrid mode.

All flags default off in production; can be enabled per-route or per-user for staged rollout.

## Server Endpoints (Stable Contracts)

1) POST `/api/realtime-session`
   - In: `{ voice?: string, inputAudioFormat?: string, outputAudioFormat?: string }`
   - Out: `{ token: string, expiresAt: string, model: string, rtcConfig?: any }`
   - Notes: token is ephemeral (short TTL); never expose server API key to client.

2) POST `/api/transcribe`
   - In: `multipart/form-data` with `file` (audio blob), optional `{ language?: string, hints?: string[] }`
   - Out (verbose):
     ```json
     {
       "segments": [
         { "id": "seg_1", "startSec": 0.00, "endSec": 3.20,
           "words": [
             { "text": "hello", "startSec": 0.10, "endSec": 0.45, "confidence": 0.93 },
             { "text": "world", "startSec": 0.46, "endSec": 0.90, "confidence": 0.71 }
           ]
         }
       ],
       "rawText": "hello world"
     }
     ```

3) POST `/api/transcribe/correct`
   - In: `{ segment: { rawText: string, startSec?: number, endSec?: number, lowConfidenceWords?: string[] }, context?: { left?: string, right?: string, domain?: string }, language?: string }`
   - Out:
     ```json
     {
       "correctedText": "hello world",
       "certainty": 0.82,
       "rationale": "Likely greeting; domain tech docs.",
       "model": "gpt5-mini"
     }
     ```

## Client Event Shapes

- Realtime text partial:
  ```ts
  type RealtimeTextDelta = { type: "rt_text_delta"; text: string; isFinal?: boolean };
  ```
- Realtime audio chunk (PCM/Opus):
  ```ts
  type RealtimeAudioDelta = { type: "rt_audio_delta"; data: ArrayBuffer };
  ```
- Transcribe result appended as user message:
  ```ts
  type TranscribeMessage = { type: "asr_final"; transcript: TranscriptSegment[] };
  ```

## Event Bus Topics (proposed)

Do not add until refactor owner confirms naming. Intended for `src/shared/events/contracts.js`.

- `voice.realtime.connecting` → `{}`
- `voice.realtime.connected` → `{ session: any }`
- `voice.realtime.error` → `{ error: string }`
- `voice.realtime.vu` → `{ level: number }` // 0..1
- `voice.realtime.textDelta` → `{ text: string, isFinal?: boolean }`
- `voice.realtime.audioDelta` → `{ data: ArrayBuffer }`
- `voice.transcribe.start` → `{}`
- `voice.transcribe.final` → `{ segments: TranscriptSegment[], rawText: string }`
- `voice.transcribe.corrected` → `{ segments: TranscriptSegment[], corrections: any }`

## Shared Types (Transcript)

```ts
type Syllable = { text: string; startSec?: number; endSec?: number; confidence?: number };
type Word = { text: string; startSec?: number; endSec?: number; confidence?: number; syllables?: Syllable[]; corrected?: boolean; correctionMeta?: { model: string; certainty: number; rationale?: string } };
type TranscriptSegment = { id: string; words: Word[]; startSec: number; endSec: number };
```

## State Boundaries (to fit refactor)

- Chat Store adds a `voice` slice containing:
  - `realtime`: { status: "idle" | "connecting" | "connected" | "error"; session?: any }
  - `transcribe`: { recording: boolean; uploading: boolean; lastResult?: TranscriptSegment[] }
  - `flags`: Record<string, boolean>

Fits P8 (ChatPanel + state). The voice slice exposes actions that publish/subscribe to the event bus topics above.

Ensure the refactor maintains a single source of truth for chat messages; voice events append messages via an adapter layer rather than writing directly to UI components.

## UI Contracts

- Buttons:
  - `Live (Realtime)`: toggles `realtime.status` and shows VU + partial captions.
  - `Transcribe`: handles recorder start/stop and posts blob to `/api/transcribe`.

- Rendering:
  - Confidence heatmap uses `Word.confidence` and optional `Syllable.confidence`.
  - Corrections visually tagged via `Word.corrected` + tooltip with `correctionMeta`.

## Error & Telemetry

- Log connect/disconnect, token expiry, ASR latency, correction hit rate.
- Surface non-fatal errors in UI toasts; do not block base chat.

## Branch & Ownership

- Suggested branch: `feature/voice-realtime-transcribe`
- Owner: Voice integration agent (this instance)
- Coordination: Refactor owner (other Codex instance)

## Integration Order (Safe Merge)

1) Land server stubs behind flags (no UI).
2) Land client hooks disabled by default.
3) Enable flags in dev builds; validate against refactor branch.
4) Iterate on UI rendering; wire to store once refactor finalizes state shape.

## Notes for Server Integration

- Express endpoints live in `server/index.js` under `/api/*` (existing pattern).
- Use `multer` (already in deps) or `busboy` for audio uploads.
- Keep keys server-side; mint ephemeral tokens for Realtime on server.


---

To-do on receipt of refactor plan:
- Map store naming/nesting to refactor’s state tree.
- Align endpoint paths/naming with routing conventions.
- Confirm error handling and logging framework.
