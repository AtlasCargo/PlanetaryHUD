Ideation History — Book Statement Compressor

A concise, source‑linked history of our design decisions and open questions. This is not a verbatim transcript; it focuses on inflection points and rationale.

2025‑08‑21 — Seed Concept
	•	User vision: Load a whole book into an LLM context and have it “compress itself,” extracting statements while discarding repetition and non‑claims. Use per‑sentence addressing as a universal numbering scheme. Build a vector space of statements that coalesces into core theses.
	•	Assistant: Proposed a two‑way architecture (bottom‑up extraction + top‑down guidance), an IST schema, a Universal Sentence Address (SA), paraphrase/entailment graph, hierarchical cores, and a facility‑location style selection. Delivered an initial Python scaffold.

2025‑08‑21 — Complexity & CEP
	•	User: “We should get some Kolmogorov complexity as well; add a model context with enrichment (fiction lower density; papers highest).” Also: test which science is densest (math vs biology).
	•	Assistant: Added Kolmogorov proxies (LZMA compressed length, NCD), and an MDL objective for core selection. Introduced CEP (Context Enrichment Profile) with doc‑type priors and density expectations. Proposed a benchmarking protocol across disciplines and cautioned about math LaTeX parsing.
	•	Delivered an upgraded single‑file script with MDL, NCD, CEP, density reports, and a roadmap.

2025‑08‑21 — Documentation Request
	•	User: “Write a markdown to explain all thinking and its future trajectory; also include this conversation as ideationhistory.md.”
	•	Assistant: Produced two documents:
	•	Design & Roadmap (this project’s living spec)
	•	Ideation History (this file)

Design Inflection Points
	1.	IST Schema — Chosen for minimality + vectorizability + provenance; keeps triples and facets.
	2.	SA Addressing — Mixed positional + simhash keys for edition stability.
	3.	Paraphrase Merge — Dual criterion (cosine OR NCD) to blend semantics with information‑theoretic similarity.
	4.	Core Selection — Switched from pure coverage to MDL‑driven (shortest faithful description), with pointer cost and CEP‑dependent targets.
	5.	Top‑Down Guidance — CEP seeds from metadata act as attractors; clusters biased by co‑support.
	6.	Contradictions — Treat as first‑class: select both sides as contested theses when coverage warrants it.

Open Questions
	•	NLI calibration: Which cross‑encoder yields best support/refute precision at book scale and how to batch cheaply?
	•	Math extraction: Best practice for theorem/lemma parsing and symbol embeddings (e.g., MathBERT vs learned tokenizers)?
	•	Edition diffs: When large edits break simhash, what’s the best fuzzy fallback without exploding false matches?
	•	Pointer cost: How to learn ptr_cost_bits from data (e.g., via validation on human compression judgments)?

Immediate Next Steps
	•	Integrate GPT‑5‑high for sentence→IST with STRICT JSON and add a fall‑through rule‑based validator.
	•	Swap in high‑quality embeddings + NLI edges and contradiction penalties into the MDL objective.
	•	Implement LaTeX theorem extraction for math corpora.
	•	Run the density benchmark on small field samples and iterate on CEP presets.

File & Artifact Trace
	•	book_compressor_mdl.py — reference implementation (MDL + CEP + NCD)
	•	Design & Roadmap.md — conceptual spec and future plan
	•	ideationhistory.md — this file

Credits
	•	Concept & constraints: User
	•	Systems design, proxies, and roadmap: Assistant

This history will be extended as we iterate (add dates, decisions, and justifications).