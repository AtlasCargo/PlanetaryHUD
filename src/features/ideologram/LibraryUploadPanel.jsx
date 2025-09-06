import React from 'react';

export default function LibraryUploadPanel({
  hasAnyData,
  selectedFile,
  setSelectedFile,
  loading,
  error,
  onProcessCsv,
}) {
  if (hasAnyData) return null;
  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
      <h2 className="text-lg font-semibold mb-2">Upload Goodreads CSV</h2>
      <p className="text-sm text-gray-400 mb-2">Upload your exported CSV of "Read" books.</p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setSelectedFile(f);
        }}
      />
      {selectedFile && (
        <div className="mt-3 space-y-2">
          <div className="text-sm text-gray-300">Selected: {selectedFile.name}</div>
          <button
            onClick={onProcessCsv}
            className="px-4 py-2 bg-neon-blue text-white rounded hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Process CSV'}
          </button>
        </div>
      )}
      {loading && <span className="ml-2 text-xs text-gray-400">Parsing…</span>}
      {!!error && <div className="text-xs text-neon-red mt-1">{error}</div>}
    </div>
  );
}


