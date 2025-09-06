import React from 'react';
import { useDatasets } from './DatasetContext';
import DatasetControlPanel from './DatasetControlPanel';

export default function DatasetController({
  activeGlobeDataset,
  availableRegions,
  selectedRegion,
  onChangeRegion,
}) {
  const { years = [] } = useDatasets() || {};
  if (!activeGlobeDataset || years.length === 0) return null;
  return (
    <DatasetControlPanel
      activeGlobeDataset={activeGlobeDataset}
      availableRegions={availableRegions}
      selectedRegion={selectedRegion}
      onChangeRegion={onChangeRegion}
    />
  );
}



