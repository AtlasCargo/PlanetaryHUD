import React, { useState } from 'react';
import { csvParse } from 'd3-dsv';
import { parseChatGPTHistory } from './chatUtils';
import { enhancedEnrichBook } from './enrichment';
import API from '../../utils/api';
import WorldviewPanel from './WorldviewPanel';
import LibraryUploadPanel from './LibraryUploadPanel';
import ChatHistoryUploadPanel from './ChatHistoryUploadPanel';
import ReadBooksPanel from './ReadBooksPanel';
import TextCompressionPanel from './TextCompressionPanel';
import CompressionStatusPanel from './CompressionStatusPanel';
import CompressionResultsPanel from './CompressionResultsPanel';
import { IdeologramWidget } from '../../ideologram';

export default function IdeologramView(props) {
  const {
    user,
    assessmentHistory,
    computeWeightedAverage,
    setWorldviewQuizOpen,
    // Uploads
    setIdeoBooks,
    setIdeoChatHistory,
    setFilePreviews,
    ideoLoading,
    ideoError,
    // Books & enrichment
    ideoBooks,
    ideoEnrichedMap,
    ideoEnriching,
    onOpenWorldview,
    weightedScores,
    onEnrichWikidata,
    onTestWikidata,
    onTestCustomSearch,
    // File tree
    setFileTree
  } = props;

  const [csvFile, setCsvFile] = useState(null);
  const [chatFile, setChatFile] = useState(null);

  // Local state/stubs for text compression panel to avoid undefined props
  const [ideoFreeText, setIdeoFreeText] = useState('');
  const [epubMeta, setEpubMeta] = useState({});
  const setEpubName = (name) => setEpubMeta((m) => ({ ...m, title: name }));
  const analyzeTextLexical = (text) => ({ textLength: (text || '').length });
  const [ideoCompressing, setIdeoCompressing] = useState(false);
  const [ideoCompressionStatus, setIdeoCompressionStatus] = useState({ pipelineSteps: [], debugMode: false });
  const [ideoCompressionResult, setIdeoCompressionResult] = useState(null);
  const setIdeoError = () => {};
  const setIdeoTextResult = () => {};

  const onProcessCsv = React.useCallback(async () => {
    if (!csvFile) return;
    const text = await csvFile.text();
    const parsed = csvParse(text);
    const books = parsed.map((row) => ({
      title: (row.Title || row.title || '').trim(),
      author: (row.Author || row.author || '').trim(),
      rating: Number(row['My Rating'] || row.rating || 0) || 0,
      year: Number(row['Year Published'] || row.year || 0) || undefined,
      isRead: String(row['Exclusive Shelf'] || row.shelf || '').toLowerCase().includes('read')
    }));
    setIdeoBooks(Array.isArray(books) ? books : []);
    try { setFilePreviews && setFilePreviews((p) => ({ ...(p||{}), 'library.json': books })); } catch {}
  }, [csvFile, setIdeoBooks, setFilePreviews]);

  const onUploadChatHistory = React.useCallback(async (e) => {
    const f = e?.target?.files?.[0] || chatFile;
    if (!f) return;
    const text = await f.text();
    const msgs = parseChatGPTHistory(text);
    setIdeoChatHistory(Array.isArray(msgs) ? msgs : []);
  }, [chatFile, setIdeoChatHistory]);

  // Fetch compressed list preview on mount
  React.useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/api/ideologram/compressed');
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setFilePreviews && setFilePreviews((p) => ({ ...(p||{}), 'compressed.json': items }));
      } catch {}
    })();
  }, [setFilePreviews]);

  // Enrichment handlers
  const handleEnrichOne = React.useCallback(async (book) => {
    try {
      const result = await enhancedEnrichBook(book, null);
      if (!result) return;
      // Attach enriched info to the book locally
      setIdeoBooks((prev) => (Array.isArray(prev)
        ? prev.map((b) => (b.title === book.title && b.author === book.author ? { ...b, enriched: { topics: result.topics, axes: result.inferredAxes, meta: result.metadata } } : b))
        : prev));
      // Append to enriched preview
      try {
        setFilePreviews && setFilePreviews((p) => {
          const arr = Array.isArray(p?.['enriched.json']) ? p['enriched.json'] : [];
          const entry = { key: `${book.title}::${book.author||''}`, meta: { topics: result.topics, mainSubjects: result.metadata?.wikidata?.mainSubjects || [] } };
          return { ...(p||{}), 'enriched.json': [...arr, entry] };
        });
      } catch {}
    } catch {}
  }, [setIdeoBooks, setFilePreviews]);

  const handleEnrichTop20 = React.useCallback(async () => {
    const readRated = (Array.isArray(ideoBooks) ? ideoBooks : [])
      .filter((b) => b && b.isRead)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 20);
    for (const book of readRated) {
      // eslint-disable-next-line no-await-in-loop
      await handleEnrichOne(book);
    }
  }, [ideoBooks, handleEnrichOne]);

  return (
    <div className="w-full h-full px-2 md:px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <WorldviewPanel
          user={user}
          assessmentHistory={assessmentHistory}
          computeWeightedAverage={computeWeightedAverage}
          setWorldviewQuizOpen={setWorldviewQuizOpen}
        />

        <div className="grid grid-cols-1 gap-4">
          <LibraryUploadPanel
            hasAnyData={(ideoBooks||[]).length > 0}
            selectedFile={csvFile}
            setSelectedFile={setCsvFile}
            loading={!!ideoLoading}
            error={ideoError}
            onProcessCsv={onProcessCsv}
          />
          <ChatHistoryUploadPanel
            loading={!!ideoLoading}
            error={ideoError}
            onUpload={(e) => { setChatFile(e?.target?.files?.[0] || null); onUploadChatHistory(e); }}
          />
        </div>

        <ReadBooksPanel
          books={ideoBooks}
          enrichedMap={ideoEnrichedMap || {}}
          enrichingMap={ideoEnriching || {}}
          ideoLoading={!!ideoLoading}
          ideoError={ideoError}
          onEnrichOne={handleEnrichOne}
          onEnrichTop20={handleEnrichTop20}
          onOpenWorldview={onOpenWorldview}
          weightedScores={weightedScores || {}}
          onEnrichWikidata={onEnrichWikidata}
          onTestWikidata={onTestWikidata}
          onTestCustomSearch={onTestCustomSearch}
        />

        {/* Ideologram Widget compute block */}
        <div className="space-y-3">
          <IdeologramWidget />
        </div>

        <div className="space-y-3">
          <TextCompressionPanel
            ideoFreeText={ideoFreeText}
            setIdeoFreeText={setIdeoFreeText}
            epubMeta={epubMeta}
            setEpubMeta={setEpubMeta}
            setEpubName={setEpubName}
            analyzeTextLexical={analyzeTextLexical}
            setIdeoTextResult={setIdeoTextResult}
            ideoCompressing={!!ideoCompressing}
            setIdeoCompressing={setIdeoCompressing}
            ideoCompressionStatus={ideoCompressionStatus}
            setIdeoCompressionStatus={setIdeoCompressionStatus}
            setIdeoCompressionResult={setIdeoCompressionResult}
            setIdeoError={setIdeoError}
            setFileTree={setFileTree}
          />
          <CompressionStatusPanel error={ideoError} compressing={!!ideoCompressing} status={ideoCompressionStatus} />
          <CompressionResultsPanel result={ideoCompressionResult} />
        </div>
      </div>
    </div>
  );
}


