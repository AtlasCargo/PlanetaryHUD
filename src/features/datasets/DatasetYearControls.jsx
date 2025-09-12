import React from 'react';

export default function DatasetYearControls({
  activeGlobeDataset,
  populationYears,
  selectedPopulationYear,
  setSelectedPopulationYear,
  lifeExpYears,
  selectedLifeExpYear,
  setSelectedLifeExpYear,
  gdpYears,
  selectedGdpYear,
  setSelectedGdpYear
}) {
  return (
    <>
      {activeGlobeDataset === 'population' && Array.isArray(populationYears) && populationYears.length > 0 && (
        <div id="population-controls" className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
          <h3 className="text-sm font-bold text-neon-blue mb-2">Population Year</h3>
          <div className="flex items-center">
            <input type="range" min={Math.min(...populationYears)} max={Math.max(...populationYears)} value={selectedPopulationYear} onChange={(e) => setSelectedPopulationYear(+e.target.value)} />
            <span className="ml-2 text-neon-blue">{selectedPopulationYear}</span>
          </div>
        </div>
      )}

      {activeGlobeDataset === 'life-expectancy' && Array.isArray(lifeExpYears) && lifeExpYears.length > 0 && (
        <div id="life-expectancy-controls" className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
          <h3 className="text-sm font-bold text-neon-blue mb-2">Life Exp. Year</h3>
          <div className="flex items-center">
            <input type="range" min={Math.min(...lifeExpYears)} max={Math.max(...lifeExpYears)} value={selectedLifeExpYear} onChange={(e) => setSelectedLifeExpYear(+e.target.value)} />
            <span className="ml-2 text-neon-blue">{selectedLifeExpYear}</span>
          </div>
        </div>
      )}

      {activeGlobeDataset === 'NY.GDP.PCAP.PP.KD' && Array.isArray(gdpYears) && gdpYears.length > 0 && (
        <div id="gdp-controls" className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
          <h3 className="text-sm font-bold text-neon-blue mb-2">GDP Year</h3>
          <div className="flex items-center">
            <input type="range" min={Math.min(...gdpYears)} max={Math.max(...gdpYears)} value={selectedGdpYear} onChange={(e) => setSelectedGdpYear(+e.target.value)} />
            <span className="ml-2 text-neon-blue">{selectedGdpYear}</span>
          </div>
        </div>
      )}
    </>
  );
}



