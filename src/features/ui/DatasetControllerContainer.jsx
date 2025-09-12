import React from 'react';
import DatasetController from '../datasets/DatasetController';

export default function DatasetControllerContainer({
  visible,
  activeGlobeDataset,
  availableRegions,
  selectedRegion,
  onChangeRegion,
}) {
  if (!visible) return null;
  return (
    <DatasetController
      activeGlobeDataset={activeGlobeDataset}
      availableRegions={availableRegions}
      selectedRegion={selectedRegion}
      onChangeRegion={onChangeRegion}
    />
  );
}



