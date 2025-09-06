import React from 'react';

export default function WidgetCard({ books = [], widget, onCompute }) {
  const total = books.length;
  const read = books.filter(b => b.isRead).length;
  const toRead = total - read;
  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
      <h2 className="text-lg font-semibold mb-2">Widget</h2>
      <p className="text-sm text-gray-400 mb-2">
        Total books: {total} | 
        <span className="text-green-400"> Read: {read}</span> | 
        <span className="text-blue-400"> To-read: {toRead}</span>
      </p>
      {widget}
      <div className="mt-2">
        <button className="px-3 py-1 bg-gray-700 rounded" onClick={onCompute}>Compute (headless)</button>
      </div>
    </div>
  );
}


