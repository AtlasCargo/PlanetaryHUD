// Core Ideologram functionality - bundled directly into the project
export { computeIdeologram, SAMPLE_ANCHORS } from './compute.js';
export { enrichBook, mapTopicsToAxes, TOPIC_TO_AXES } from './enrich.js';
export { parseGoodreadsCsv } from './importers/goodreads.js';
export { enrichBookWikidata } from './wikidata.js';
export { analyzeTextLexical, DEFAULT_LEXICON } from './text.js';
