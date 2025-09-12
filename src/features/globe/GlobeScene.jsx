import React, { useMemo } from 'react';
import * as THREE from 'three';
import GlobeController from './GlobeController';

export default function GlobeScene({
  countries,
  warRoomMode,
  deepStateFeatures,
  materialType,
  globeTextureType,
  globeOpacity,
  showGraticules,
  showAtmosphere,
  showGlobeTexture,
  fpsLimit,
  rotationEnabled,
  activeGlobeDataset,
  populationData,
  lifeExpData,
  gdpData,
  selectedPopulationYear,
  selectedLifeExpYear,
  selectedGdpYear,
  genericSeries,
  genericSelectedYear,
  onGlobeReady
}) {
  const globeMaterial = useMemo(() => ({
    isNightTexture: globeTextureType === 'night',
    color: 0xffffff,
    opacity: globeOpacity,
    transparent: true,
    bumpScale: 0.3,
    shininess: materialType === 'phong' ? 1 : undefined,
    emissive: (materialType === 'phong' || materialType === 'lambert')
      ? new THREE.Color(0xffffff)
      : undefined,
    emissiveIntensity: (materialType === 'phong' || materialType === 'lambert')
      ? 0.3
      : undefined
  }), [materialType, globeTextureType, globeOpacity]);

  return (
    <GlobeController
      countries={countries}
      warRoomMode={warRoomMode}
      deepStateFeatures={deepStateFeatures}
      globeMaterial={globeMaterial}
      showGraticules={showGraticules}
      showAtmosphere={showAtmosphere}
      onGlobeReady={onGlobeReady}
      showTexture={showGlobeTexture}
      fpsLimit={fpsLimit}
      rotationEnabled={rotationEnabled}
      activeGlobeDataset={activeGlobeDataset}
      populationData={populationData}
      lifeExpData={lifeExpData}
      gdpData={gdpData}
      selectedPopulationYear={selectedPopulationYear}
      selectedLifeExpYear={selectedLifeExpYear}
      selectedGdpYear={selectedGdpYear}
      genericSeries={genericSeries}
      genericSelectedYear={genericSelectedYear}
    />
  );
}


