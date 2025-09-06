# Book Statement Compressor — Design & Roadmap

## Executive Summary
We propose a practical pipeline to distill long documents (books, papers, reports) into a compact set of **core statements** represented as vectors and linked to their sources via stable sentence addresses. The system combines:

- **Bottom‑up extraction**: sentence → Irreducible Statement Tuple (IST) → vectors → paraphrase/entailment graph → hierarchical cores.
- **Top‑down guidance**: a **Context Enrichment Profile (CEP)** with genre/discipline priors (fiction vs. scientific paper) and seed theses (from metadata) to bias clustering and selection.
- **Kolmogorov‑style compression**: MDL/NCD proxies to choose the smallest faithful description (cores + pointers) of the book.

Outputs include statement vectors, support/refute edges, multi‑level cores (paragraph, chapter, book), and transparent provenance (backlinks to sentence addresses).

---

## Core Concepts

### Irreducible Statement Tuple (IST)
A minimal, typed representation for a claim:

```json
{
  "id": "{SA}",
  "triple": ["SUBJ", "PRED", "OBJ"],
  "polarity": "affirm|negate",
  "modality": "assertive|hypothetical|prescribed|questioned|evidential",
  "tense": "past|present|future|timeless",
  "hedging": "none|low|medium|high",
  "scope": "local|global|character_voice|narrator_voice",
  "entities": [{"text":"...","type":"PERSON|ORG|LOC|WORK|OTHER","span":[start,end]}],
  "evidence_span": [start_char, end_char],
  "confidence": 0.0
}
```

**Why:** faithful compression, consistent vectorization, and explicit provenance.

### Universal Sentence Addressing (USA / “SA”)
Edition‑robust IDs for sentences:

```
SA = {book_uid}:{ch_idx}.{para_idx}.{sent_idx}:{simhash(normalize(sent_text))[:8]}
```

- Positional tuple for human readability; hash for robustness to minor edits.
- SA is the key for all backlinks, coverage accounting, and reproducibility.

### Ideologos Multivector
For each IST, we build a **multivector**:
- Dense semantic embedding **e ∈ R^d** (from an embedding model)
- Discrete facets (polarity/modality/tense/hedging/scope/entity‑type histogram, temporal buckets)
- Concatenate and optionally project to **z = W·[e; facets]** to respect graph structure

---

## Architecture

### Bottom‑Up Flow
1. **Segment & address**: chapters → paragraphs → sentences → SA
2. **Statementization** (LLM): sentence → IST (or `none`)
3. **Vectorization**: IST → embedding + facets → multivector
4. **Paraphrase merge**: cosine ≥ τ₁ OR NCD ≤ τ₂ → clusters → proto‑statements
5. **Graph building** (optional first pass): NLI labels edges as support/refute/entail
6. **Hierarchical cores**: communities/chapters → cores → global theses

### Top‑Down Flow (CEP‑guided)
- **CEP** (Context Enrichment Profile) encodes doc type priors:
  - Expected statement density, merge thresholds, pointer costs, contradiction penalties
  - Seeds (from blurbs/Wikidata) act as attractors; statements are scored support/refute/unrelated
- Clustering and selection are biased toward coherence with CEP + seeds

---

## Kolmogorov Proxies & MDL Objective
True Kolmogorov complexity is uncomputable; we approximate with:

- **Compressed length** `L(x)` via `lzma` (bits)
- **Normalized Compression Distance (NCD)** for pairwise similarity:
  
  `NCD(x,y) = (C(xy) - min(C(x),C(y))) / max(C(x),C(y))`

- **MDL selection** of cores: choose K to minimize total description length
  
  > Minimize  \( L(cores\;K) + L(book \mid K) \)

We implement a greedy proxy where the marginal gain for candidate cluster **c** is:

```
Δ_MDL(c) ≈ Σ_{i∈newly_covered} L(IST_i)  –  ( L(proto_c) + |newly_covered| * ptr_cost )
```

If Δ_MDL(c) ≤ 0, skip; otherwise accept and mark its covered ISTs. This yields a small faithful set of cores with explicit coverage.

---

## Context Enrichment Profile (CEP)
A JSON profile that tunes behavior by genre/discipline:

```json
{
  "doc_type": "paper|fiction|nonfiction|math|biology|...",
  "expected_density_per_1k": 45.0,
  "thresholds": { "sim_cos": 0.84, "ncd": 0.40, "min_cluster": 2 },
  "mdl": { "ptr_cost_bits": 56, "target_coverage": 0.90 }
}
```

**Examples:**
- **Fiction** → lower expected density, stricter merge (avoid over‑claiming), higher min_cluster
- **Biology** → higher density, merge easier (more redundancy), hedging detection emphasized
- **Math** → theorem/lemma aware parsing; equation blocks treated as high‑confidence IST seeds

---

## Statement Density & Field “Denseness” Experiments
We quantify “how dense” different literature is.

**Metrics:**
- `statements_per_1k_tokens`
- `assertive_ratio` vs `modal_ratio`
- `avg_compressed_bits_per_token` (complexity per token)
- MDL **reduction per 1k tokens** (compressibility via cores)

**Protocol:**
1. Build corpora: ~200 docs per field (e.g., math/physics/cs via arXiv; biology via bioRxiv). Strip references.
2. Run compressor with `doc_type="paper"` + field‑specific CEP tweaks.
3. For math, add LaTeX‑aware rules: extract Theorem/Lemma/Definition environments as IST seeds.
4. Compare distributions across fields. Publish violin plots and rank with confidence intervals.

**Hypotheses to test:**
- Biology has high **statement counts** with higher **hedging**; math has fewer sentences but high **bits per token** and higher **MDL reduction** when theorems are recognized.

---

## Contradictions & Contestation
- NLI edges label **support/refute** between nodes and clusters
- During selection, penalize selecting mutually refuting cores unless surfaced as **contested theses** with backlinks
- Output both sides explicitly when coverage is high on both

---

## Evaluation & Reliability
- **Faithfulness precision**: sample (core → sentences) links; verify entailment
- **Coverage**: fraction of non‑trivial ISTs covered by selected cores
- **Stability**: re‑run on alternate editions; SA and clusters should largely match
- **Human audit**: export notebook with top cores and their strongest backlinks

---

## Interfaces & File Artifacts
- `sentences.jsonl` — `{sa, text, ch, para, sent}`
- `ists.jsonl` — ISTs per sentence or `{"none":true}`
- `embeddings.npy` — float32 [N, d]
- `paraphrase_clusters.json` — cluster → SA list, stats
- `graph_edges.jsonl` — (optional) labeled edges
- `chapter_cores.jsonl` — proto/core ISTs
- `book_core.json` — final theses with backlinks & coverage
- `density_report.json` — density and complexity metrics

---

## Prompt Templates (LLM‑facing)

**Sentence → IST (STRICT JSON):**
```
You are a precise statement extractor. Given ONE sentence, output ONE IST if it asserts a claim; otherwise {"none":true}. STRICT JSON only.
```

**Cluster → Proto‑statement:**
```
Summarize the following ISTs into ONE broader IST entailed by most members. No new claims. STRICT JSON.
```

**Chapter/Community → Core:**
```
Given proto‑statements with coverage and edges, synthesize ONE core IST maximizing coverage and coherence. STRICT JSON.
```

---

## Pseudocode (Greedy MDL Selection)
```python
covered = set(); chosen = []
while coverage < target:
    best, gain = None, -inf
    for c in clusters:
        new = items(c) - covered
        if not new: continue
        gain_bits = sum(L(ist[i]) for i in new)
        cost_bits = L(proto(c)) + len(new)*ptr_cost
        if gain_bits - cost_bits > gain:
            best, gain = c, gain_bits - cost_bits
    if gain <= 0: break
    chosen.append(best); covered |= items(best)
```

---

## Roadmap

**Phase 1 — MVP (done/near‑done)**
- IST schema + SA addressing
- Cosine + NCD clustering
- CEP priors by doc type
- Greedy MDL core selection
- Density diagnostics & exports

**Phase 2 — Scientific‑grade extraction**
- Swap in GPT‑5‑high for sentence→IST with STRICT JSON and calibration
- High‑quality embeddings + cross‑encoder NLI for support/refute
- Math LaTeX parser for theorem environments; inline equation capture
- Contradiction‑aware MDL (penalize mutually refuting cores)

**Phase 3 — UX & Auditability**
- Interactive graph explorer (cores on the hull; hover to list backlinks)
- “Click‑to‑context” jumps from core → sentences (SAs) → full text
- Side‑by‑side edition comparison using SA hashes

**Phase 4 — Research Experiments**
- Field density benchmark (papers across disciplines)
- Fiction vs nonfiction density & compressibility profiles
- Longitudinal author‑style drift via multivector statistics

**Phase 5 — Productization**
- API with batch endpoints and webhooks
- Pluggable CEP templates per publisher/journal
- CI checks for reproducible cores on ingestion

---

## Limitations & Mitigations
- **Uncomputed knowledge**: Kolmogorov proxies (LZMA/NCD) are approximations → combine with semantics (embeddings, NLI)
- **Edition drift**: SA simhash can break on heavy rewrites → keep positional tuple + fallback fuzzy matching
- **Math formula loss**: TXT conversion drops structure → add LaTeX parsing & symbol embeddings
- **LLM hallucination risk**: STRICT JSON with evidence spans + human‑in‑the‑loop audits on cores

---

## Quick Start (Ops Notes)
1. Convert EPUB→TXT; keep a stable `book_uid`.
2. Choose/edit a CEP (doc type, thresholds, MDL target).
3. Run pipeline to produce ISTs, clusters, cores, densities.
4. Inspect `book_core.json` and backlinks before publishing.

---

## Appendix: CEP Presets (suggested)
- **fiction**: `expected_density≈5/1k`, `sim_cos=0.88`, `ncd=0.30`, `min_cluster=3`, `ptr_cost_bits=72`
- **paper**: `expected_density≈45/1k`, `sim_cos=0.84`, `ncd=0.40`, `min_cluster=2`, `ptr_cost_bits=56`
- **math**: `expected_density≈40/1k` (with theorems), `sim_cos=0.83`, `ncd=0.42`, `min_cluster=2`, LaTeX seeds
- **biology**: `expected_density≈48/1k`, `sim_cos=0.85`, `ncd=0.38`, `min_cluster=2`, hedging emphasis
