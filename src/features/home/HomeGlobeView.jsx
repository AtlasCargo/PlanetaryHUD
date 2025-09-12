import React from 'react';
import GlobeScene from '../globe/GlobeScene';

export default function HomeGlobeView({
  visible,
  showGlobe,
  countries,
  warRoomMode,
  deepStateFeatures,
  materialType,
  globeTextureType,
  globeOpacity,
  showGraticules,
  showAtmosphere,
  onGlobeReady,
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
  isLoading,
  error
}) {
  if (!visible) return null;
  return (
    <div
      className="relative w-full h-full"
      style={{
        opacity: globeOpacity,
        transition: 'opacity 0.3s ease'
      }}
    >
      {showGlobe && (
        <GlobeScene
          countries={countries}
          warRoomMode={warRoomMode}
          deepStateFeatures={deepStateFeatures}
          materialType={materialType}
          globeTextureType={globeTextureType}
          globeOpacity={globeOpacity}
          showGraticules={showGraticules}
          showAtmosphere={showAtmosphere}
          onGlobeReady={onGlobeReady}
          showGlobeTexture={showGlobeTexture}
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
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-neon-blue">Loading data...</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-neon-red">Error: {error}</div>
        </div>
      )}
    </div>
  );
}


