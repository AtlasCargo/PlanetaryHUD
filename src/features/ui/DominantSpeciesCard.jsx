import React from 'react';

export default function DominantSpeciesCard({ species = 'Homo Sapiens' }) {
  return (
    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 transition-all">
      <p className="text-lg">
        Dominant Species: <br />
        <span className="text-2xl font-bold text-blue-900">{species}</span>
      </p>
    </div>
  );
}



