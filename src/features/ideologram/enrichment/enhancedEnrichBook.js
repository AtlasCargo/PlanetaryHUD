export default async function enhancedEnrichBook(book, { enrichBook, enrichBookWikidata }) {
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
    { title: cleanTitle.split(' ').slice(0, 2).join(' '), author, desc: 'first 2 words + author' }
  ];

  let openLibraryData = null;
  let wikidataData = null;

  for (const strategy of searchStrategies) {
    if (!strategy.title.trim()) continue;
    try {
      const result = await enrichBook({ title: strategy.title, author: strategy.author || undefined, isbn: book.isbn });
      if (result?.metadata?.subjects?.length > 0) { openLibraryData = result; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  for (const strategy of searchStrategies) {
    if (!strategy.title.trim()) continue;
    try {
      const result = await enrichBookWikidata({ title: strategy.title, author: strategy.author || undefined, isbn: book.isbn });
      if (result?.metadata?.mainSubjects?.length > 0) { wikidataData = result; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  const combinedMetadata = {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    openLibrary: openLibraryData?.metadata || null,
    wikidata: wikidataData?.metadata || null,
    sources: {
      openLibrary: openLibraryData?.metadata?.sources?.openLibrary || null,
      wikidata: wikidataData?.metadata?.sources?.wikidata || null
    }
  };

  const allTopics = new Set();
  openLibraryData?.metadata?.subjects?.forEach(s => allTopics.add(s.toLowerCase()));
  wikidataData?.metadata?.mainSubjects?.forEach(s => allTopics.add(s.toLowerCase()));
  wikidataData?.metadata?.genres?.forEach(s => allTopics.add(s.toLowerCase()));

  const combinedAxes = { ...openLibraryData?.inferredAxes, ...wikidataData?.inferredAxes };
  for (const [key, value] of Object.entries(combinedAxes)) {
    combinedAxes[key] = Math.max(-1, Math.min(1, value));
  }

  return {
    metadata: combinedMetadata,
    topics: Array.from(allTopics),
    inferredAxes: combinedAxes,
    confidence: Math.min(1, ((openLibraryData?.confidence || 0) + (wikidataData?.confidence || 0)) / 2)
  };
}



