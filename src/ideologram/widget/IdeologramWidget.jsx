// Simplified IdeologramWidget component - bundled directly into the project
import React from 'react';
import useIdeologram from './useIdeologram.js';

export default function IdeologramWidget() {
  const { books, quizResponses, result, loading, compute, addBook, addQuizResponse, reset } = useIdeologram();

  const handleCompute = async () => {
    try {
      await compute();
    } catch (error) {
      console.error('Failed to compute ideologram:', error);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Ideologram Widget</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Books ({books.length})</h3>
          {books.map((book, index) => (
            <div key={index} className="text-gray-400 text-sm">
              {book.title} by {book.author}
            </div>
          ))}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Quiz Responses ({quizResponses.length})</h3>
          {quizResponses.map((response, index) => (
            <div key={index} className="text-gray-400 text-sm">
              {response.dimension}: {response.value}
            </div>
          ))}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleCompute}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Computing...' : 'Compute Ideologram'}
          </button>
          
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
        
        {result && (
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Result</h3>
            <div className="space-y-2">
              {Object.entries(result).map(([dimension, value]) => (
                <div key={dimension} className="text-gray-400 text-sm">
                  {dimension}: {value.toFixed(3)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
