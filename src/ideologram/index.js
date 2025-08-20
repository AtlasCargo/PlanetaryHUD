// Main Ideologram exports - bundled directly into the project
export { default as IdeologramWidget } from './widget/IdeologramWidget.jsx';
export { default as useIdeologram } from './widget/useIdeologram.js';

// Core functionality
export { 
  computeIdeologram,
  SAMPLE_ANCHORS
} from './core/compute.js';

export { 
  enrichBook,
  mapTopicsToAxes,
  TOPIC_TO_AXES
} from './core/enrich.js';

export { 
  parseGoodreadsCsv
} from './core/importers/goodreads.js';

export { 
  enrichBookWikidata
} from './core/wikidata.js';

export { 
  analyzeTextLexical,
  DEFAULT_LEXICON
} from './core/text.js';
