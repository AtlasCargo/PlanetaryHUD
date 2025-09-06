import React from 'react';

export default function ReadBooksPanel({
  books,
  enrichedMap,
  enrichingMap,
  ideoLoading,
  ideoError,
  onEnrichOne,
  onEnrichTop20,
  onOpenWorldview,
  weightedScores,
  onEnrichWikidata,
  onTestWikidata,
  onTestCustomSearch,
}) {
  const readBooks = Array.isArray(books) ? books.filter((b) => b.isRead) : [];
  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
      <h2 className="text-lg font-semibold mb-2">Read books</h2>
      <p className="text-sm text-gray-400">Showing books detected as read. Only read and rated books are used by default in the compute.</p>
      <div className="mt-2 flex gap-4 flex-wrap text-sm">
        <span>Total loaded: {books?.length || 0}</span>
        <span className="text-green-400">Read: {readBooks.length}</span>
        <span className="text-blue-400">To-read: {(books||[]).filter(b => !b.isRead).length}</span>
        <span className="text-yellow-400">Rated: {readBooks.filter(b => b.rating > 0).length}</span>
      </div>
      <div className="mt-2 max-h-64 overflow-auto border border-gray-700 rounded p-2">
        {readBooks.length === 0 ? (
          <div className="text-gray-400 text-sm">No read books detected yet. Upload a CSV above.</div>
        ) : (
          <ul className="list-none m-0 p-0 text-sm">
            {readBooks.slice(0, 200).map((b, i) => {
              const key = `${b.title}::${b.author || ''}`;
              const info = enrichedMap[key];
              const isEnriching = !!enrichingMap[key];
              return (
                <li key={`${b.title}-${i}`} className="py-1 border-b border-gray-800">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <strong className="mr-2">{b.title}</strong>
                    {b.author && <span className="text-gray-400">by {b.author}</span>}
                    {b.rating != null && <span className="ml-auto">⭐ {b.rating}</span>}
                  </div>
                  <div className="text-xs text-gray-400 flex gap-3 flex-wrap">
                    {b.dateRead && <span>Date read: {b.dateRead}</span>}
                    {!!(b.shelves?.length) && <span>Shelves: {b.shelves.slice(0,4).join(', ')}{b.shelves.length>4?'…':''}</span>}
                  </div>
                  {!info && (
                    <div className="mt-1">
                      <button className="px-2 py-0.5 bg-gray-700 rounded text-[11px] disabled:opacity-50" disabled={isEnriching} onClick={() => onEnrichOne(b)}>
                        {isEnriching ? 'Enriching…' : 'Enrich this'}
                      </button>
                    </div>
                  )}
                  {info && (
                    <div className="text-[11px] text-gray-300 mt-1">
                      {(() => {
                        const topics = Array.isArray(info.meta?.topics)
                          ? info.meta.topics
                          : (Array.isArray(info.meta?.mainSubjects)
                              ? info.meta.mainSubjects
                              : (Array.isArray(info.meta?.subjects) ? info.meta.subjects : []));
                        return topics.length > 0 ? (
                          <div>Topics: {topics.slice(0,6).join(', ')}{topics.length>6?'…':''}</div>
                        ) : null;
                      })()}
                      <div>
                        econ_lr: {Math.round(((info.axes?.econ_lr||0)*100))}% · cult_libcon: {Math.round(((info.axes?.cult_libcon||0)*100))}% · auth_lib: {Math.round(((info.axes?.auth_lib||0)*100))}% · global_local: {Math.round(((info.axes?.global_local||0)*100))}% · tech_prog: {Math.round(((info.axes?.tech_prog||0)*100))}% · epistemic_rat: {Math.round(((info.axes?.epistemic_rat||0)*100))}%
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-2 flex gap-2 items-center">
        <button className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50" disabled={ideoLoading} onClick={onEnrichTop20}>Enrich top 20 via Open Library</button>
        <button className="px-3 py-1 bg-purple-700 rounded disabled:opacity-50" disabled={ideoLoading} onClick={onOpenWorldview}>🌍 Worldview Assessment</button>
        <div className="ml-4 p-2 bg-gray-800 rounded border border-gray-600">
          <div className="text-xs text-gray-400 mb-1">Weighted Worldview Scores</div>
          <div className="flex gap-2">
            {Object.entries(weightedScores || {}).map(([dimension, data]) => (
              <div key={dimension} className="text-center">
                <div className="text-xs font-semibold capitalize">{dimension.split('_')[0]}</div>
                <div className="text-xs text-gray-300">{Math.round((data.score || data.score) * 100)}%</div>
                <div className="text-xs text-gray-500">{data.assessmentCount != null ? `${data.assessmentCount} assessments` : `${Math.round((data.overallConfidence || data.overallConfidence) * 100)}% conf`}</div>
              </div>
            ))}
          </div>
        </div>
        <button className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50" disabled={ideoLoading} onClick={onEnrichWikidata}>Enrich via Wikidata</button>
        <button className="px-2 py-1 bg-green-600 rounded text-xs disabled:opacity-50" disabled={ideoLoading} onClick={onTestWikidata}>Test Wikidata</button>
        <button className="px-2 py-1 bg-blue-600 rounded text-xs disabled:opacity-50" disabled={ideoLoading} onClick={onTestCustomSearch}>Test Custom Search</button>
      </div>
      {!!ideoError && <div className="text-xs text-neon-red mt-1">{ideoError}</div>}
    </div>
  );
}


