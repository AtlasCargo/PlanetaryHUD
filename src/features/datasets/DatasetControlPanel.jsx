import React, { useEffect, useRef } from 'react';
import { useDatasets } from './DatasetContext';

const idFor = (datasetId) => {
  if (datasetId === 'population') return 'population-controls';
  if (datasetId === 'life-expectancy') return 'life-expectancy-controls';
  if (datasetId === 'NY.GDP.PCAP.PP.KD') return 'gdp-controls';
  return 'dataset-controls';
};

const titleFor = (datasetId) => {
  if (datasetId === 'population') return 'Population';
  if (datasetId === 'life-expectancy') return 'Life Expectancy';
  if (datasetId === 'NY.GDP.PCAP.PP.KD') return 'GDP per Capita';
  return 'Dataset';
};

export default function DatasetControlPanel({
  activeGlobeDataset,
  availableRegions = ['World'],
  selectedRegion = 'World',
  onChangeRegion,
}) {
  const { years = [], selectedYear, setSelectedYear } = useDatasets() || {};
  const panelRef = useRef(null);

  // Draggable behavior (match previous inline logic)
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const onMouseMove = (moveEvent) => {
        const x = moveEvent.clientX - offsetX;
        const y = moveEvent.clientY - offsetY;
        el.style.position = 'fixed';
        el.style.top = `${y}px`;
        el.style.left = `${x}px`;
        el.style.bottom = 'auto';
        el.style.transform = 'none';
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    el.addEventListener('mousedown', onMouseDown);
    return () => { el.removeEventListener('mousedown', onMouseDown); };
  }, []);

  if (!activeGlobeDataset || years.length === 0) return null;
  const id = idFor(activeGlobeDataset);
  const title = titleFor(activeGlobeDataset);

  return (
    <div
      id={id}
      ref={panelRef}
      className="fixed bottom-[25vh] left-1/2 transform -translate-x-1/2 z-50 bg-gray-900/80 backdrop-blur-md p-3 rounded-lg border border-neon-blue/30"
      style={{ width: '350px' }}
    >
      <button
        className="absolute top-1 right-1 text-neon-blue/50 hover:text-neon-blue"
        onClick={() => {
          const panel = document.querySelector(`#${id}`);
          if (panel) panel.style.display = 'none';
        }}
      >
        ✕
      </button>
      <div className="mb-2">
        <label className="text-neon-blue text-xs block mb-1">Region/Country:</label>
        <select
          value={selectedRegion}
          onChange={(e) => onChangeRegion && onChangeRegion(e.target.value)}
          className="w-full p-1 bg-gray-800 text-neon-blue border border-neon-blue/20 rounded text-xs"
        >
          {availableRegions.map((region) => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-between mb-1">
        <span className="text-neon-blue text-xs">Year: {selectedYear}</span>
        <span className="text-neon-blue text-xs">{title}</span>
      </div>
      <input
        type="range"
        min={Math.min(...years)}
        max={Math.max(...years)}
        value={selectedYear || Math.min(...years)}
        onChange={(e) => setSelectedYear && setSelectedYear(+e.target.value)}
        step="1"
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{Math.min(...years)}</span>
        <span>{Math.max(...years)}</span>
      </div>
    </div>
  );
}


