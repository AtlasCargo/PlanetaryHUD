// Main Ideologram exports - bundled directly into the project
import IdeologramWidget from './widget/IdeologramWidget';
import useIdeologram from './widget/useIdeologram';
import { computeIdeologram, SAMPLE_ANCHORS } from './core/compute.js';
import { enrichBook, mapTopicsToAxes, TOPIC_TO_AXES } from './core/enrich.js';
import { parseGoodreadsCsv } from './core/importers/goodreads.js';
import { enrichBookWikidata } from './core/wikidata.js';
import { analyzeTextLexical, DEFAULT_LEXICON } from './core/text.js';

export {
  IdeologramWidget,
  useIdeologram,
  computeIdeologram,
  SAMPLE_ANCHORS,
  enrichBook,
  mapTopicsToAxes,
  TOPIC_TO_AXES,
  parseGoodreadsCsv,
  enrichBookWikidata,
  analyzeTextLexical,
  DEFAULT_LEXICON
};
