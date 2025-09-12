import React from 'react';
import API from '../../utils/api';

export default function SavedScoresPanel({ scores, setScores }) {
  return (
    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 mb-4">
      <h3 className="text-sm font-bold text-neon-blue mb-2">Saved Scores</h3>
      <button
        className="mb-2 px-2 py-1 bg-gray-700 rounded"
        onClick={async () => {
          try {
            const token = localStorage.getItem('token');
            if (token && token !== 'DUMMY_TOKEN') {
              const res = await API.get('/api/ideologram/scores');
              setScores(Array.isArray(res.data?.entries) ? res.data.entries : []);
            } else {
              const raw = localStorage.getItem('ideologram:scores:v1');
              const db = raw ? JSON.parse(raw) : { entries: [] };
              setScores(Array.isArray(db.entries) ? db.entries : []);
            }
          } catch {}
        }}
      >
        Reload
      </button>
      <div className="text-xs text-gray-300" style={{ maxHeight: 160, overflow: 'auto' }}>
        {scores.length === 0 ? (
          <div className="text-gray-500">No saved entries</div>
        ) : (
          <ul className="list-none m-0 p-0">
            {scores.slice().reverse().map((e, i) => (
              <li key={i} className="py-1 border-b border-gray-800">
                <div className="flex gap-2 items-baseline flex-wrap">
                  <strong>{e.title || 'Untitled'}</strong>
                  {e.author && <span className="text-gray-400">by {e.author}</span>}
                  {e.isbn && <span className="text-gray-400"> · ISBN: {e.isbn}</span>}
                  {e.fileName && <span className="text-gray-500"> · {e.fileName}</span>}
                  <span className="ml-auto text-gray-400 text-[10px]">{e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}</span>
                </div>
                <div className="text-[11px] text-gray-300">
                  Politicalness: {Math.round((e.metrics?.politicalness || 0) * 100)}% · econ_lr: {Math.round((e.axes?.econ_lr || 0) * 100)}%
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}



