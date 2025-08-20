# Quiz Design

## Goals
- Short (≈36 items), balanced across 6 axes.
- Neutral wording; mix of policy proxies and value statements.
- 5-point Likert (Strongly disagree → Strongly agree); allow "skip".

## Structure
- 6 axes × 6 items each; half reverse-coded.
- Optional confidence slider per section to modulate amplitude.
- Adaptive shortening later (IRT/CAT) once we have item stats.

## Scoring
- Map answers to y_j ∈ [−1,1], apply loadings L_j per axis, sum with item quality weights.
- Normalize per-axis to avoid dominance by any single section.

## UX
- One screen per 3–4 items; progress indicator; save state locally.
- Post-results: show which items most influenced each axis; let users revisit answers.

## Example items (sketch)
- Economic: "Markets generally allocate resources better than governments." (+econ)
- Cultural: "Traditions should be preserved even if they limit personal choices." (+conserv)
- Authority: "For most issues, individuals should choose for themselves without state involvement." (+liberty)
- Scope: "Immigration strengthens society in the long run." (−particular)
- Tech: "We should embrace technological solutions, even if risks are uncertain." (+tech)
- Epistemic: "Intuition and tradition often reveal truths data cannot." (−rationalist)
