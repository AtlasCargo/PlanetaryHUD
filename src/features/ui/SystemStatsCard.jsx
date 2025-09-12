import React from 'react';

export default function SystemStatsCard({ civAge, setCivAge }) {
  return (
    <div className="space-y-4">
      <h4 className="text-xl font-bold text-gray-400">System Stats</h4>
      <p className="text-lg">Age of Civilization: <span className="font-bold">{civAge}×10³y</span></p>
      <p className="text-lg">Population: <span className="font-bold">8×10⁹</span></p>
      <input
        type="range"
        min={0}
        max={20000}
        value={civAge}
        onChange={(e) => setCivAge(+e.target.value)}
        className="w-full h-2 bg-gray-700 rounded-lg mt-2"
      />
      <span className="text-sm text-neon-blue">Year: {civAge}</span>
    </div>
  );
}



