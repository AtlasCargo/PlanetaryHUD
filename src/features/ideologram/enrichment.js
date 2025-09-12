import { enrichBook } from '../../ideologram';

export async function enhancedEnrichBook(book, setError) {
  const title = (book.title || '').trim();
  const author = (book.author || '').trim();
  if (!title) return null;

  const cleanTitle = title
    .replace(/\([^)]*\)/g, '')
    .replace(/[#\d]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const searchStrategies = [
    { title: cleanTitle, author, desc: 'clean title + author' },
    { title: cleanTitle, author: '', desc: 'clean title only' },
    { title: title, author, desc: 'original title + author' },
    { title: title, author: '', desc: 'original title only' },
    { title: cleanTitle.split(' ').slice(0, 3).join(' '), author, desc: 'first 3 words + author' },
    { title: cleanTitle.split(' ').slice(0, 2).join(' '), author, desc: 'first 2 words + author' },
  ];

  let best = null;
  let bestScore = -Infinity;

  for (const strategy of searchStrategies) {
    if (!strategy.title.trim()) continue;
    try {
      const result = await enrichBook({ title: strategy.title, author: strategy.author || undefined, isbn: book.isbn });
      if (result) {
        const quality = result.enrichmentQuality ?? 0;
        if (quality > bestScore) {
          bestScore = quality;
          best = result;
        }
      }
    } catch (err) {
      // continue to next strategy
      if (setError) setError(null);
    }
  }

  return best;
}



