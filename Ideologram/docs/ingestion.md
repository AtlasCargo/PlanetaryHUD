# Data Ingestion

## Goodreads (preferred path)
- Users export CSV from Goodreads: My Books → Import/Export → Export Library (.csv).
- Parse fields: Title, Author, My Rating, Date Read/Added, ISBN13 (if present), Shelves.
- Resolve canonical IDs via Open Library (OLID/ISBN). Avoid scraping or relying on deprecated Goodreads APIs.
- Let users edit/confirm matches; allow excluding non-representative books.

## Manual entry
- Allow pasting a list: one per line: "Title — Author — Rating"; or upload a simple CSV.

## Other sources (later)
- The StoryGraph, LibraryThing, Open Library reading logs.

## Matching strategy
- Fuzzy title/author match → query Open Library → choose best match → store OLID and ISBN.
- Cache resolved IDs locally; warn on low-confidence matches.

## Security & privacy
- Default: process in-browser; never upload CSV unless user opts in to cloud features.
- If using API: strip personal fields; send only title/author/rating; no user IDs.
