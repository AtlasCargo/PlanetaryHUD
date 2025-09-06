import React from 'react';

export default function EnrichmentDetailModal({ detail, onClose }) {
  if (!detail) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">
            Enrichment Details: {detail.book.title}
            {detail.book.author && ` by ${detail.book.author}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
          <div className="mb-4 p-3 bg-gray-800 rounded text-xs">
            <div className="text-yellow-400 font-semibold mb-2">🔍 Debug: Raw Data Structure</div>
            <pre className="text-gray-300 overflow-auto max-h-32">{JSON.stringify(detail.currentInfo, null, 2)}</pre>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-blue-400 border-b border-blue-600 pb-2">📚 Open Library Data</h4>
              <div className="space-y-3">
                {detail.currentInfo.meta?.openLibrary ? (
                  <>
                    {detail.currentInfo.meta.openLibrary.sources?.openLibrary?.workKey && (
                      <div className="text-sm">
                        <div className="text-gray-400">Work Key:</div>
                        <div className="font-mono text-xs bg-gray-800 p-2 rounded">{detail.currentInfo.meta.openLibrary.sources.openLibrary.workKey}</div>
                      </div>
                    )}
                    {detail.currentInfo.meta.openLibrary.sources?.openLibrary?.editionKey && (
                      <div className="text-sm">
                        <div className="text-gray-400">Edition Key:</div>
                        <div className="font-mono text-xs bg-gray-800 p-2 rounded">{detail.currentInfo.meta.openLibrary.sources.openLibrary.editionKey}</div>
                      </div>
                    )}
                    {Array.isArray(detail.currentInfo.meta.openLibrary.subjects) && detail.currentInfo.meta.openLibrary.subjects.length > 0 && (
                      <div className="text-sm">
                        <div className="text-gray-400">Subjects ({detail.currentInfo.meta.openLibrary.subjects.length}):</div>
                        <div className="flex flex-wrap gap-1">
                          {detail.currentInfo.meta.openLibrary.subjects.map((subject, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs">{subject}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {detail.currentInfo.meta.openLibrary.classifications && (
                      <div className="text-sm">
                        <div className="text-gray-400">Classifications:</div>
                        <div className="space-y-1">
                          {detail.currentInfo.meta.openLibrary.classifications.lcc && <div className="font-mono text-xs bg-gray-800 p-2 rounded">LCC: {detail.currentInfo.meta.openLibrary.classifications.lcc}</div>}
                          {detail.currentInfo.meta.openLibrary.classifications.ddc && <div className="font-mono text-xs bg-gray-800 p-2 rounded">DDC: {detail.currentInfo.meta.openLibrary.classifications.ddc}</div>}
                        </div>
                      </div>
                    )}
                    {detail.currentInfo.meta.openLibrary.isFictionInferred !== undefined && (
                      <div className="text-sm">
                        <div className="text-gray-400">Fiction Classification:</div>
                        <div className={`px-2 py-1 rounded text-xs ${detail.currentInfo.meta.openLibrary.isFictionInferred ? 'bg-purple-900 text-purple-200' : 'bg-green-900 text-green-200'}`}>
                          {detail.currentInfo.meta.openLibrary.isFictionInferred ? 'Fiction' : 'Non-fiction'}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-400">No Open Library data available</div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-green-400 border-b border-green-600 pb-2">🌐 Wikidata Data</h4>
              <div className="space-y-3">
                {detail.currentInfo.meta?.sources?.wikidata && (
                  <div className="text-sm">
                    <div className="text-gray-400">QID:</div>
                    <div className="font-mono text-xs bg-gray-800 p-2 rounded">{detail.currentInfo.meta.sources.wikidata.qid || 'N/A'}</div>
                  </div>
                )}
                {Array.isArray(detail.currentInfo.meta?.mainSubjects) && detail.currentInfo.meta.mainSubjects.length > 0 && (
                  <div className="text-sm">
                    <div className="text-gray-400">Main Subjects:</div>
                    <div className="flex flex-wrap gap-1">
                      {detail.currentInfo.meta.mainSubjects.map((subject, i) => (
                        <span key={i} className="px-2 py-1 bg-green-900 text-green-200 rounded text-xs">{subject}</span>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(detail.currentInfo.meta?.genres) && detail.currentInfo.meta.genres.length > 0 && (
                  <div className="text-sm">
                    <div className="text-gray-400">Genres:</div>
                    <div className="flex flex-wrap gap-1">
                      {detail.currentInfo.meta.genres.map((genre, i) => (
                        <span key={i} className="px-2 py-1 bg-green-700 text-green-200 rounded text-xs">{genre}</span>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(detail.currentInfo.meta?.instanceOf) && detail.currentInfo.meta.instanceOf.length > 0 && (
                  <div className="text-sm">
                    <div className="text-gray-400">Instance Of:</div>
                    <div className="flex flex-wrap gap-1">
                      {detail.currentInfo.meta.instanceOf.map((instance, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-700 text-gray-200 rounded text-xs">{instance}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-700">
            <h4 className="text-md font-semibold text-yellow-400 mb-3">📊 Enhanced Enrichment Results</h4>
            {detail.currentInfo.topics && detail.currentInfo.topics.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-300 mb-2">Combined Topics ({detail.currentInfo.topics.length}):</div>
                <div className="flex flex-wrap gap-1">
                  {detail.currentInfo.topics.map((topic, i) => (
                    <span key={i} className="px-2 py-1 bg-yellow-900 text-yellow-200 rounded text-xs">{topic}</span>
                  ))}
                </div>
              </div>
            )}
            {detail.currentInfo.enrichmentQuality && (
              <div className="mb-4">
                <div className="text-sm text-gray-300 mb-2">Enrichment Quality:</div>
                <div className="flex gap-4 text-xs">
                  <span className={`px-2 py-1 rounded ${detail.currentInfo.enrichmentQuality.openLibrary ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>Open Library: {detail.currentInfo.enrichmentQuality.openLibrary ? '✓' : '✗'}</span>
                  <span className={`px-2 py-1 rounded ${detail.currentInfo.enrichmentQuality.wikidata ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>Wikidata: {detail.currentInfo.enrichmentQuality.wikidata ? '✓' : '✗'}</span>
                  <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded">Total Topics: {detail.currentInfo.enrichmentQuality.totalTopics}</span>
                </div>
              </div>
            )}
            <div className="mb-4 p-2 bg-gray-800 rounded text-xs">
              <div className="text-yellow-400 font-semibold mb-1">🔍 Axes Debug:</div>
              <div className="text-gray-300">Axes object: {JSON.stringify(detail.currentInfo.axes)}</div>
              <div className="text-gray-300">Axes type: {typeof detail.currentInfo.axes}</div>
              <div className="text-gray-300">Axes keys: {detail.currentInfo.axes ? Object.keys(detail.currentInfo.axes).join(', ') : 'none'}</div>
            </div>
            <div className="mb-4">
              <div className="text-sm text-gray-300 mb-2">Computed Axes:</div>
              {detail.currentInfo.axes && Object.keys(detail.currentInfo.axes).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(detail.currentInfo.axes).map(([axis, value]) => (
                    <div key={axis} className="text-sm">
                      <div className="text-gray-400 capitalize">{axis.replace(/_/g, ' ')}:</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div className={`h-2 rounded-full ${value > 0 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.abs(value) * 100}%` }}></div>
                        </div>
                        <span className="text-xs font-mono w-12 text-right">{Math.round(value * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">No axes data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


