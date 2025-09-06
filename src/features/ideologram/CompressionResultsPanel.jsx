import React from 'react';

export default function CompressionResultsPanel({ result }) {
  if (!result) return null;
  return (
    <div className="mt-2 border border-green-600 rounded p-2 text-sm bg-green-900/20">
      <h3 className="text-green-400 font-semibold mb-2">📚 Book Compression Results</h3>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="text-green-300 font-medium">Document Type:</div>
          <div className="text-gray-300">{result.docType || 'nonfiction'}</div>
        </div>
        <div>
          <div className="text-green-300 font-medium">Coverage:</div>
          <div className="text-gray-300">{result.coverage_fraction ? `${(result.coverage_fraction * 100).toFixed(1)}%` : 'N/A'}</div>
        </div>
        <div>
          <div className="text-green-300 font-medium">MDL Reduction:</div>
          <div className="text-gray-300">{result.mdl_reduction_bits ? `${result.mdl_reduction_bits} bits` : 'N/A'}</div>
        </div>
        <div>
          <div className="text-green-300 font-medium">Theses Found:</div>
          <div className="text-gray-300">{result.theses?.length || 0}</div>
        </div>
      </div>
      {result.theses && result.theses.length > 0 && (
        <div className="mt-3">
          <div className="text-green-300 font-medium mb-2">Key Theses:</div>
          <div className="space-y-2">
            {result.theses.slice(0, 3).map((thesis, idx) => (
              <div key={idx} className="bg-gray-800/50 p-2 rounded text-xs">
                <div className="font-medium text-gray-200">
                  {thesis.triple?.[0] || 'Subject'}: {thesis.triple?.[1] || 'predicate'} {thesis.triple?.[2] || 'object'}
                </div>
                <div className="text-gray-400">
                  Confidence: {(thesis.confidence * 100).toFixed(0)}% · Backlinks: {thesis.backlinks?.length || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


