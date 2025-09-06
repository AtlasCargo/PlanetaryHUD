import React from 'react';

export default function ToReadList({ books = [] }) {
  const toRead = Array.isArray(books) ? books.filter((b) => !b.isRead) : [];
  return (
    <div className="mt-4 p-4 rounded-lg border border-gray-700 bg-gray-900/40">
      <h3 className="text-lg font-semibold mb-2">To-Read Books ({toRead.length})</h3>
      <div className="max-h-40 overflow-y-auto space-y-2">
        {toRead.slice(0, 50).map((book, index) => (
          <div key={book.id || index} className="p-2 bg-gray-800 rounded border border-gray-700">
            <div className="font-medium text-white">{book.title}</div>
            <div className="text-sm text-gray-300">by {book.author}</div>
            {book.shelf && book.shelf !== 'unknown' && (
              <div className="text-xs text-blue-400">Shelf: {book.shelf}</div>
            )}
          </div>
        ))}
        {toRead.length > 50 && (
          <div className="text-center text-gray-500 text-xs">
            ... and {toRead.length - 50} more to-read books
          </div>
        )}
      </div>
    </div>
  );
}


