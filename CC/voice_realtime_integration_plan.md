# PlanetaryHUD: Realtime + Transcribe Integration Plan

Note: CC = Coordination Communication.

This document outlines how to integrate two voice interaction modes into the existing chat experience:

- Live Realtime (OpenAI Realtime API) for full-duplex, low-latency voice chat that will later drive a live avatar.
- Push-to-talk Transcribe (gpt-4o-transcribe) with confidence visualization and a second-pass correction pipeline.

It also sketches a future Unified mode that combines the strengths of both.

## Goals

- Add two mic buttons: "Live (Realtime)" and "Transcribe".
- Realtime: stream mic audio to the model, receive streaming audio/text back, display partials, and optionally play TTS.
- Transcribe: record, send to `gpt-4o-transcribe`, render transcript with word/syllable confidence heatmap.
- Improve transcript quality by re-checking low-confidence regions with LLMs: try `gpt5-mini`, escalate to `gpt-5` if needed.
- Keep all auth secure via server-created ephemeral credentials for any client-direct Realtime connection.

## High-Level Architecture

- UI/Client
  - Two entry points (buttons): `Live (Realtime)` and `Transcribe`.
  - Shared chat surface: messages/events append into the same conversation timeline.
  - Audio capture (Web Audio / MediaDevices) and playback (AudioWorklet/MediaSource).
  - Event bus integration: publish realtime deltas and transcribe results via `src/shared/events`.

- Server
  - `POST /api/realtime-session` → creates an ephemeral Realtime session/token using server OpenAI key.
  - `POST /api/transcribe` → proxies to `gpt-4o-transcribe` with options for timestamps, confidences, etc.
  - `POST /api/transcribe/correct` → correction pipeline over low-confidence segments using `gpt5-mini`, fallback to `gpt-5`.
  - Lives alongside existing Express routes in `server/index.js` behind VOICE_* flags.

- OpenAI APIs
  - Realtime API via WebRTC (recommended) or WebSocket.
  - Transcriptions via `gpt-4o-transcribe` (sync or streaming).

## UI/UX Additions

- Buttons in chat header:
  - `Live (Realtime)`
    - Toggle state (Connect / Stop).
    - Shows live VU meter and partial captions.
  - `Transcribe`
    - Press-and-hold (or tap-to-start/stop) recorder.
    - On release, uploads audio, shows word/syllable confidence heatmap.

- Transcript Rendering
  - Word-level color map (e.g., green→red for confidence 1.0→0.0).
  - Expand-on-hover to show syllable-level confidences.
  - Mark corrected regions (subtle underline/dash) with tooltip: "auto-corrected" + rationale.

## Mode A: OpenAI Realtime (Live)

Recommended: WebRTC client from the browser for lowest latency, with server-issued ephemeral key. WebSocket fallback is viable when WebRTC is constrained.

### Server: Create Ephemeral Realtime Session

Pseudo (Node/TypeScript):

```ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Exchanges server API key for a short-lived ephemeral client token.
export async function createRealtimeSession(req, res) {
  const { voice = "verse", inputAudioFormat = "pcm16", outputAudioFormat = "pcm16" } = req.body || {};
  const session = await openai.chat.completions.create({
    // If your SDK exposes a Realtime session creation helper, use it.
    // Otherwise call the REST endpoint directly, e.g. POST /v1/realtime/sessions
    // This snippet is illustrative; wire to official Realtime session creation in your SDK.
    // model: "gpt-4o-realtime-preview", // pick the latest realtime-capable model
  });
  // Response should contain ephemeral token/credentials and any negotiated media settings.
  res.json(session);
}
```

Notes
- Do not expose your server API key to the browser. Always mint ephemeral credentials server-side.
- If your SDK lacks a convenience method, call the REST endpoint `POST /v1/realtime/sessions` and return the ephemeral token + RTC configuration to the client.

### Client: WebRTC Flow

1) Fetch ephemeral session from `/api/realtime-session`.
2) Create `RTCPeerConnection`, attach local mic stream.
3) Set remote description from Realtime, set local description, exchange ICE as needed.
4) Send data channel messages to control turns (e.g., signal when user starts/stops speaking) if required.
5) Receive remote audio for TTS playback and real-time text events for captions.

### Client: WebSocket Fallback (audio frames)

- Connect to `wss://api.openai.com/v1/realtime?model=<realtime-model>` with headers:
  - `Authorization: Bearer <ephemeral-token>`
  - `OpenAI-Beta: realtime=v1`
- Stream mic audio as binary chunks via `input_audio_buffer.append` frames; then `input_audio_buffer.commit`.
- Create a response with `response.create`.
- Receive `response.audio.delta` and `response.output_text.delta` for streaming output.

Example event skeleton:

```json
{ "type": "input_audio_buffer.append", "audio": "<base64-pcm16>" }
{ "type": "input_audio_buffer.commit" }
{ "type": "response.create", "response": { "instructions": "answer the user" } }
```

## Mode B: Push-to-talk Transcribe (gpt-4o-transcribe)

### Server: `/api/transcribe`

Options to request (subject to model support):
- `response_format: "verbose_json"` for timestamps, word-level confidences.
- `temperature` small (e.g., 0.1) for stability.
- `language` hint if known (optional).
- `audio_format` sent (e.g., `wav`/`webm-opus`), server converts to what the API expects (16k PCM recommended).

Pseudo (Node/TypeScript):

```ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribe(req, res) {
  const audioFile = req.file; // multer or similar
  const result = await openai.audio.transcriptions.create({
    model: "gpt-4o-transcribe",
    file: audioFile.path, // or stream
    response_format: "verbose_json",
    // word_timestamps: true, // if available
    // logprobs: true,        // if available
  });
  res.json(result);
}
```

### Client: Recorder

- Press/hold (or tap) to capture mic.
- On stop: upload blob to `/api/transcribe`.
- Render transcript with confidence heatmap (see below), then run correction pipeline.

## Confidence Visualization (Word → Syllable)

We aim to highlight syllable confidence. Most ASR outputs word/token confidences; we derive syllable confidences by aligning tokens to syllables.

1) Inputs
   - Word-level timestamps + confidences (from `verbose_json`).
   - Optional token-level logprobs/timecodes if available.

2) Syllabification Strategy
   - Split transcript words into syllables using a lightweight language-specific library (English: hyphenation patterns or a syllable splitter).
   - When token/time alignment is available, map token spans to syllables by overlap in time.
   - Otherwise, proportionally split the word time/confidence across syllables.

3) Aggregation
   - For a syllable spanning tokens T, define confidence as:
     - `conf_syll = clamp(mean(conf_token_i))` or conservative `min(conf_token_i)`.
   - If only word-level confidence exists, use:
     - `conf_syll = conf_word` (equal per syllable), or weight by relative syllable duration estimate.

4) Rendering
   - Color gradient: green (>=0.9), yellow (~0.6–0.9), red (<0.6).
   - UI: word broken into syllables with per-syllable span + data-confidence.

## Second-pass Correction Pipeline

Goal: Improve low-confidence regions by leveraging context-sensitive LLM checks.

1) Identify Candidates
   - Mark words containing any syllable with `conf < THRESHOLD` (e.g., 0.6) as candidates.
   - Build short windows around each candidate (±1–2 seconds or ±N words) to provide context.

2) Prompting Strategy (gpt5-mini first)
   - Provide: the noisy transcript segment, neighboring context, optional domain hints, and the low-confidence tokens.
   - Ask for: corrected text, a minimal diff, and a self-reported certainty in [0,1].
   - Constrain the model to preserve meaning and timing as much as possible.

3) Escalation
   - If `certainty < 0.7` (tunable) or if the diff increases ambiguity, escalate to `gpt-5` with the same prompt.

4) Post-Processing
   - Replace only the marked segment in the transcript.
   - Optionally re-estimate syllable confidences in corrected region (set to model certainty or re-run ASR alignment if available).
   - Tag corrected spans for UI (tooltip with rationale + model used).

### Server: `/api/transcribe/correct`

```ts
export async function correct(req, res) {
  const { segment, context, language } = req.body;
  // 1) Try gpt5-mini
  const mini = await openai.chat.completions.create({
    model: "gpt5-mini",
    messages: [
      { role: "system", content: "You correct low-confidence ASR segments with minimal edits." },
      { role: "user", content: JSON.stringify({ segment, context, language }) },
    ],
    temperature: 0,
  });
  const draft = parseCorrection(mini);
  if (draft.certainty >= 0.7) return res.json({ ...draft, model: "gpt5-mini" });

  // 2) Escalate to gpt-5
  const strong = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: "You correct low-confidence ASR segments with minimal edits." },
      { role: "user", content: JSON.stringify({ segment, context, language }) },
    ],
    temperature: 0,
  });
  const best = parseCorrection(strong);
  return res.json({ ...best, model: "gpt-5" });
}
```

Note: `parseCorrection` extracts `{ correctedText, certainty, rationale }` from the model’s structured response. Use JSON-mode or tool-calling to enforce structure.

## Data Model (Transcript)

```ts
type Syllable = {
  text: string;
  startSec?: number;
  endSec?: number;
  confidence?: number; // 0..1
};

type Word = {
  text: string;
  startSec?: number;
  endSec?: number;
  confidence?: number; // 0..1
  syllables?: Syllable[];
  corrected?: boolean;
  correctionMeta?: { model: string; certainty: number; rationale?: string };
};

type TranscriptSegment = {
  id: string;
  words: Word[];
  startSec: number;
  endSec: number;
};
```

## Integration Points with Current Chat

- Chat store/state (Phase 8): add a `voice` slice with connections (realtime session state, audio buffers, transcript queue).
- Message stream adapter: treat Realtime text output as incremental assistant messages; treat Transcribe result as a user message.
- Audio pipeline: share recorder across modes; playback uses a single output node.
- Event bus: publish/subscribe to `voice.*` topics to decouple UI components from transport.

## Unified Mode (Future)

Two paths to unify UX into a single "Talk" button:

1) Hybrid Live-First
   - On press: connect Realtime and immediately stream audio.
   - In parallel: also push audio chunks to `gpt-4o-transcribe` for robust text logs and confidence; reconcile text streams.

2) Smart Routing
   - If network/jitter is high, fall back to local record + transcribe.
   - Otherwise prefer Realtime.

Both modes still run correction pipeline for polished captions.

## Implementation Plan / Milestones (aligned to refactor phases)

M0 — Bus + flags (P0)
- Define `voice.*` events in docs; temporary shim in code only after refactor owner approves.
- Add VOICE_* flags; no UI changes.

M1 — Realtime skeleton (pre-P8)
- Server: `/api/realtime-session` (ephemeral).
- Client: WebRTC connect, mic capture, basic caption stream, audio playback.

M2 — Transcribe plumbing (pre-P8)
- Server: `/api/transcribe` to `gpt-4o-transcribe`.
- Client: recorder UI, upload, show plain transcript.

M3 — Confidence visuals (word-level) (P8)
- Render confidence-based coloring per word.

M4 — Syllable-level mapping (P8)
- Add syllabification + aggregation.
- UI hover to show syllables.

M5 — Correction pipeline (P8)
- Server: `/api/transcribe/correct` using `gpt5-mini` → fallback `gpt-5`.
- Client: update transcript with diffs + visual tags.

M6 — Unified mode (optional) (P12)
- Single "Talk" button with hybrid or smart routing.

## Testing & Evaluation

- Unit tests for syllabification and confidence aggregation.
- Golden transcripts for domain phrases; measure WER before/after correction.
- Latency metrics (mic → first token, mic → first audio frame) for Realtime.

## Risks & Mitigations

- SDK/endpoint drift: pin SDK versions; gate new capabilities behind feature flags.
- Syllable accuracy varies by language: start with English; gate others by opt-in.
- Privacy: avoid storing raw audio; redact PII; configurable retention.
- Token cost control: cap correction calls per minute; batch multiple low-confidence regions when possible.

## Open Questions

- Languages to support first? Domain dictionaries to bias recognition?
- How to surface model uncertainty in UI affordances without overwhelming users?
- Should we provide a user toggle to view raw vs corrected transcript?

---

Appendix A: Minimal Client Stubs

```ts
// Realtime
async function startRealtime() {
  const sess = await fetch("/api/realtime-session", { method: "POST" }).then(r => r.json());
  // Use sess creds to establish WebRTC or WSS connection to Realtime API.
}

function stopRealtime() { /* close peer / socket */ }

// Transcribe
async function startTranscribe() { /* begin recording */ }

async function stopTranscribeAndUpload(blob: Blob) {
  const fd = new FormData();
  fd.append("file", blob, "audio.webm");
  const resp = await fetch("/api/transcribe", { method: "POST", body: fd }).then(r => r.json());
  renderTranscript(resp);
  const low = extractLowConfidence(resp);
  if (low.length) {
    const corrected = await fetch("/api/transcribe/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment: low, context: getContext() })
    }).then(r => r.json());
    applyCorrections(resp, corrected);
  }
}
```

Appendix B: Confidence Palette

- >= 0.90: `#16a34a` (green)
- 0.75–0.89: `#84cc16`
- 0.60–0.74: `#f59e0b`
- < 0.60: `#ef4444` (red)
