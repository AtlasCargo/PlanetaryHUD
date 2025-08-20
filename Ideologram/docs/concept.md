# Concept

- Purpose: Provide a transparent, privacy-preserving way to visualize ideological tendencies.
- Inputs: Rated books (CSV import) and/or a short quiz.
- Output: An ideologram — a vector across a few interpretable axes with an amplitude (strength/coherence) and a confidence score.
- Principle: Low-friction for casual users (quiz-only), richer for readers (book import), and honest about uncertainty.

## User flows
- Books-first: Upload Goodreads CSV → resolve titles → preview/edit list → compute → review explanations per dimension → share/save.
- Quiz-first: 30–40 item Likert quiz → compute → optional: add books to refine.
- Combined: Import + quiz → weighted fusion into one vector.

## Why vectors?
- Captures both direction (which way) and amplitude (how strongly/consistently).
- Maintains nuance; not a single label but a transparent profile.

## Guardrails
- Clear disclaimers; no pejoratives.
- Show uncertainty when data is sparse or contradictory.
- Let users exclude books not representative of their worldview.
