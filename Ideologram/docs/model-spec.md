# Model Spec (Ideologram)

A vector v in R^d with amplitude a and confidence c.

## Dimensions (d = 6, initial)
- Economic: State/Planned (−1) ↔ Market/Capital (＋1)
- Cultural: Progressive/Openness (−1) ↔ Traditional/Conserving (＋1)
- Authority: Authoritarian (−1) ↔ Libertarian (＋1)
- Scope: Cosmopolitan/Universal (−1) ↔ National/Particular (＋1)
- Tech/Progress: Precaution/Conserve (−1) ↔ Techno-optimist/Growth (＋1)
- Epistemic: Intuition/Traditional (−1) ↔ Rationalist/Evidential (＋1)

Names are descriptive, not prescriptive. All axes are in [−1, +1].

## From books
- Each book i has vector b_i ∈ [−1,1]^d and meta confidence κ_i ∈ [0,1].
- User rating r_i ∈ {1..5} → signal s_i = (r_i − 3)/2 ∈ [−1,1].
- Weight w_i = |s_i| · κ_i · ρ_i · u_i
  - ρ_i: recency decay ∈ (0,1], e.g., exp(−Δt/τ).
  - u_i: user-declared representativeness ∈ [0,1].
- Contribution: v_books_raw = Σ_i (s_i · b_i) · w_i.

## From quiz
- Items j map to loadings L_j ∈ [−1,1]^d; response x_j ∈ {1..5} → y_j = (x_j − 3)/2.
- Weight q_j = item_quality_j ∈ [0,1] (reverse-coded where needed).
- Contribution: v_quiz_raw = Σ_j (y_j · L_j) · q_j.

## Fusion
- Data-adaptive blend α ∈ [0,1]: α = n_books / (n_books + k), k≈12 (tunable).
- v_raw = α·v_books_raw + (1−α)·v_quiz_raw.
- Direction: d̂ = normalize(v_raw) (fallback to zeros if ||v_raw||≈0).

## Amplitude and confidence
- Coherence χ ∈ [0,1]: 1 − directional_variance of contributing unit vectors (weighted).
- Strength S ∈ [0,1]: min(1, log1p(W)/log1p(W₀)), W = Σ weights, W₀≈30.
- Amplitude a = χ · S.
- Confidence c factors data sufficiency and agreement between sources, e.g.,
  - c = min(1, sqrt(n_books/20) ⊕ sqrt(n_quiz/40)) · agreement_penalty,
  - agreement_penalty = 1 − 0.5·(1 − cosine(v_books_raw, v_quiz_raw)).

## Explainability
- Per-dimension contributions: list top books/items pushing each axis with signed impact.
- Show sensitivity: how results change if you drop any single top contributor.

## Calibration
- Start with curated anchors for b_i.
- Later: fit a linear model from text embeddings to axes using the anchor set; constrain to [−1,1].
