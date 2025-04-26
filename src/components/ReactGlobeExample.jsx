/**
 * ReactGlobeExample.jsx
 *
 * Renders an interactive 3D globe with a futuristic HUD.
 */
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import ParticlesBackground from './Effects/ParticlesBackground';
import ScannerEffect from './Effects/ScannerEffect';
import GlowOverlay from './Effects/GlowOverlay';
import Portal from './Portal';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import GraphComponent from './GraphComponent';
import Globe from './Globe';
import { scaleSequentialSqrt } from 'd3-scale';
import { interpolateYlOrRd, interpolateRdYlGn, interpolateGreys } from 'd3-scale-chromatic';
import { csvParse } from 'd3-dsv';
import { loadDataset, getAvailableDatasets } from '../utils/loadDataset';

export default function ReactGlobeExample() {
  // -------------------------------
  // REFS & STATE
  // -------------------------------
  const globeRef = useRef(null);
  const isUserInteracting = useRef(false);
  const autoRotateAnimationId = useRef(null);

  const [countries, setCountries] = useState({ features: [] });
  const [hoverD, setHoverD] = useState(null);

  const initialPanelHeight = typeof window !== 'undefined'
    ? (60 / window.innerHeight) * 100
    : 10;

  // Basic layout & resizing
  const [dimensions, setDimensions] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    return {
      left: isMobile ? (isLandscape ? 15 : 0) : 20,
      right: isMobile ? (isLandscape ? 15 : 0) : 20,
      top: isMobile ? 10 : initialPanelHeight,
      bottom: isMobile ? 8 : initialPanelHeight
    };
  });
  const [isResizing, setIsResizing] = useState({
    left: false,
    right: false,
    top: false,
    bottom: false
  });
  const [sidebarWidths, setSidebarWidths] = useState({
    left: window.innerWidth <= 768 ? (window.innerWidth > window.innerHeight ? 15 : 80) : 20,
    right: window.innerWidth <= 768 ? (window.innerWidth > window.innerHeight ? 15 : 80) : 20
  });

  // UI toggles
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(1);
  const [particlesOpacity, setParticlesOpacity] = useState(1);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [enableCpuMonitor, setEnableCpuMonitor] = useState(false);
  const [cpuUsage, setCpuUsage] = useState(0);

  // Sidebar state
  const [leftHidden, setLeftHidden] = useState(false);
  const [rightHidden, setRightHidden] = useState(false);

  // Globe dataset & controls
  const [activeDataset, setActiveDataset] = useState(null);
  const [activeGlobeDataset, setActiveGlobeDataset] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);

  // Globe UI toggles
  const [showGraph, setShowGraph] = useState(false);
  const [showGlobe, setShowGlobe] = useState(true);
  const [showGraticules, setShowGraticules] = useState(false);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [materialType, setMaterialType] = useState('basic');
  const [updateFPS, setUpdateFPS] = useState(24); // Start with 24 FPS
  const [globeTextureType, setGlobeTextureType] = useState('night');
  const [globeOpacity, setGlobeOpacity] = useState(1);
  const [showGlobeTexture, setShowGlobeTexture] = useState(true);
  const [lowPowerMode, setLowPowerMode] = useState(false);

  // Data states for population or life expectancy
  const [populationData, setPopulationData] = useState(null);
  const [lifeExpData, setLifeExpData] = useState([]);
  const [populationYears, setPopulationYears] = useState([]);
  const [selectedPopulationYear, setSelectedPopulationYear] = useState(null);
  const [lifeExpYears, setLifeExpYears] = useState([]);
  const [selectedLifeExpYear, setSelectedLifeExpYear] = useState(null);

  // Region states
  const [availableRegions, setAvailableRegions] = useState(['World']);
  const [selectedRegion, setSelectedRegion] = useState('World');

  // UI states for loading & tooltips
  const [isLoadingGlobeData, setIsLoadingGlobeData] = useState(false);
  const [globeDataError, setGlobeDataError] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isGlobeReset, setIsGlobeReset] = useState(true);

  // Country name normalization
  const countryNameMapping = {
    'united states of america': 'united states',
    'united kingdom': 'united kingdom',
    'russian federation': 'russia',
    'democratic republic of the congo': 'democratic republic of congo',
    'republic of congo': 'congo',
    'côte d\'ivoire': 'ivory coast',
    'czech republic': 'czechia',
    'republic of korea': 'south korea',
    'democratic people\'s republic of korea': 'north korea',
    'myanmar': 'burma',
    'eswatini': 'swaziland'
  };

  const normalizeCountryName = (name) => {
    const mapped = countryNameMapping[name.toLowerCase().trim()] || name.toLowerCase().trim();
    return mapped;
  };

  // -------------------------------
  // AUTO-ROTATION & INTERACTION
  // -------------------------------
  const startAutoRotate = () => {
    if (autoRotateAnimationId.current != null) return;
    let lastTime = performance.now();
    const BASE_SPEED = 0.0008;
    const animate = (time) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      if (rotationEnabled && globeRef.current) {
        const currentPOV = globeRef.current.pointOfView();
        globeRef.current.pointOfView({ ...currentPOV, lng: currentPOV.lng - BASE_SPEED * deltaTime });
      }
      autoRotateAnimationId.current = requestAnimationFrame(animate);
    };
    autoRotateAnimationId.current = requestAnimationFrame(animate);
  };

  const stopAutoRotate = () => {
    if (autoRotateAnimationId.current !== null) {
      cancelAnimationFrame(autoRotateAnimationId.current);
      autoRotateAnimationId.current = null;
    }
  };

  useEffect(() => {
    if (!globeRef.current) return;
    if (rotationEnabled) {
      startAutoRotate();
    } else if (!isUserInteracting.current && autoRotateAnimationId.current !== null) {
      cancelAnimationFrame(autoRotateAnimationId.current);
      autoRotateAnimationId.current = null;
    }
  }, [rotationEnabled]);

  // -------------------------------
  // MISC. EFFECTS & DATA FETCHING
  // -------------------------------
  // Refresh globe on user interaction
  const refreshGlobe = () => {
    if (globeRef.current) {
      globeRef.current.pointOfView(globeRef.current.pointOfView(), 33);
    }
  };

  // Fetch GeoJSON countries
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((err) => console.error('Error loading GeoJSON:', err));
  }, []);

  // Detect maximum value for some example usage
  const maxVal = useMemo(() => {
    const getVal = (f) =>
      f.properties?.GDP_MD_EST / Math.max(1e5, f.properties?.POP_EST || 1) || 0;
    return Math.max(...countries.features.map(getVal));
  }, [countries]);

  // Setup globeMaterial
  const computedGlobeMaterial = useMemo(() => ({
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

  // Power saver mode effect
  useEffect(() => {
    if (lowPowerMode) {
      setGlowEnabled(false);
      setShowAtmosphere(false);
      setGlobeOpacity(0.5);
      setShowGlobeTexture(false);
    }
  }, [lowPowerMode]);

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing.left) {
        const newWidth = Math.max(15, Math.min((e.clientX / window.innerWidth) * 100, 40));
        setSidebarWidths((prev) => ({ ...prev, left: newWidth }));
      }
      if (isResizing.right) {
        const newWidth = Math.max(15, Math.min(((window.innerWidth - e.clientX) / window.innerWidth) * 100, 40));
        setSidebarWidths((prev) => ({ ...prev, right: newWidth }));
      }
      if (isResizing.top) {
        const newTop = (e.clientY / window.innerHeight) * 100;
        setDimensions((d) => ({ ...d, top: Math.max(5, Math.min(newTop, 30)) }));
      }
      if (isResizing.bottom) {
        const newBottom = ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
        setDimensions((d) => ({ ...d, bottom: Math.max(5, Math.min(newBottom, 20)) }));
      }
    };

    const handleMouseUp = () => {
      setIsResizing({ left: false, right: false, top: false, bottom: false });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };

    if (Object.values(isResizing).some(Boolean)) {
      document.body.classList.add('resizing');
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };
  }, [isResizing]);

  // OrbitControls for user interaction
  useEffect(() => {
    if (!isGlobeReady || !globeRef.current) return;
    const controls = new OrbitControls(
      globeRef.current.camera(),
      globeRef.current.renderer().domElement
    );
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.rotateSpeed = 0.8;
    controls.autoRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;

    controls.addEventListener('start', () => { isUserInteracting.current = true; });
    controls.addEventListener('end', () => { isUserInteracting.current = false; });
    return () => controls.dispose();
  }, [isGlobeReady, rotationEnabled]);

  // Globe ready callback
  const onGlobeReady = () => {
    setIsGlobeReady(true);
    setTimeout(() => {
      if (globeRef.current) {
        const pov = globeRef.current.pointOfView();
        globeRef.current.pointOfView({ ...pov }, 10);
      }
    }, 100);
    
    // Switch to 1 FPS after 2 seconds to trigger hover effect
    setTimeout(() => {
      setUpdateFPS(1);
    }, 2000);
    
    if (globeRef.current && typeof globeRef.current.debug === 'function') {
      globeRef.current.debug(true); // Enable debug in underlying library if needed
    }
  };

  // CPU load monitoring (if enabled)
  useEffect(() => {
    if (!enableCpuMonitor) return;
    let lastTime = performance.now();
    let frameCount = 0;
    let rafId;
    const checkLoad = () => {
      const now = performance.now();
      frameCount++;
      if (now >= lastTime + 1000) {
        const targetFPS = 30;
        const actualFPS = frameCount / ((now - lastTime) / 1000);
        const load = 100 - Math.min((actualFPS / targetFPS) * 100, 100);
        setCpuUsage(load);
        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(checkLoad);
    };
    rafId = requestAnimationFrame(checkLoad);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      setCpuUsage(0);
    };
  }, [enableCpuMonitor]);

  // Hover handler
  const handleHover = useCallback((hoveredCountry, event) => {
    setHoverD(hoveredCountry);
    if (event) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  }, []);

  // -------------------------------
  // DATA FETCHING & MERGING
  // -------------------------------
  // Fetch life expectancy CSV
  useEffect(() => {
    fetch('https://ourworldindata.org/grapher/life-expectancy.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        const lifeExpKey = Object.keys(parsed[0]).find(key => key.toLowerCase().includes('life expectancy'));
        if (!lifeExpKey) return;

        // Get all entities
        const allEntities = [...new Set(parsed.map(d => d.Entity.trim()))];
        const regions = [
          "World","Africa","Asia","Europe","Americas","North America","South America","Oceania",
          "European Union","High income","Low income","Upper middle income","Lower middle income"
        ].filter(r => allEntities.includes(r));

        setAvailableRegions(['World', ...regions.filter(r => r !== 'World'), ...allEntities.sort()]);

        const availableYears = [...new Set(parsed.map(d => +d.Year).filter(year => !isNaN(year)))].sort((a,b)=>a-b);
        setLifeExpYears(availableYears);

        const defaultYear = availableYears.find(y => y >= 1950) || availableYears[0];
        setSelectedLifeExpYear(defaultYear);

        const yearFiltered = parsed.filter(d => +d.Year === defaultYear);
        const result = yearFiltered
          .filter(d => !regions.includes(d.Entity.trim()))
          .map(d => ({
            entity: d.Entity.trim(),
            year: +d.Year,
            value: +d[lifeExpKey],
            isCountry: true
          }))
          .filter(d => !isNaN(d.value));

        setLifeExpData(result);
      })
      .catch(() => {});
  }, []);

  // Fetch population CSV
  useEffect(() => {
    fetch('https://ourworldindata.org/grapher/population.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        const popKey = Object.keys(parsed[0]).find(key =>
          key.toLowerCase().includes('population') && !key.toLowerCase().includes('density')
        );
        if (!popKey) return;
        const aggregates = new Set([
          "World", "Africa", "Asia", "Europe", "Americas", "Oceania",
          "European Union", "High income", "Low income", "Upper middle income", "Lower middle income"
        ]);
        let filteredPop = parsed.filter(d => !aggregates.has(d.Entity.trim()));
        const availableYears = [...new Set(filteredPop.map(d => +d.Year).filter(y => !isNaN(y)))].sort((a,b)=>a-b);
        setPopulationYears(availableYears);
        const defaultYear = Math.max(...availableYears);
        setSelectedPopulationYear(defaultYear);

        filteredPop = filteredPop.filter(d => +d.Year === defaultYear);
        const result = filteredPop.map(d => ({
          entity: d.Entity.trim(),
          year: +d.Year,
          population: +d[popKey],
          value: +d[popKey]
        })).filter(d => !isNaN(d.population));

        setPopulationData(result);
      })
      .catch(() => {});
  }, []);

  // Listen to window resizes
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      const isLandscape = window.innerWidth > window.innerHeight;
      setSidebarWidths({
        left: isMobile ? (isLandscape ? 15 : 80) : 20,
        right: isMobile ? (isLandscape ? 15 : 80) : 20
      });
      setDimensions((prev) => ({
        ...prev,
        left: isMobile ? (isLandscape ? 15 : 0) : 20,
        right: isMobile ? (isLandscape ? 15 : 0) : 20,
        top: isMobile ? 10 : prev.top,
        bottom: isMobile ? 8 : prev.bottom
      }));
      if (isMobile && !isLandscape) {
        setLeftHidden(true);
        setRightHidden(true);
      } else if (isMobile && isLandscape) {
        setLeftHidden(false);
        setRightHidden(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => setTimeout(handleResize, 100));
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Update life expectancy data when year/region changes
  useEffect(() => {
    if (activeGlobeDataset !== 'life-expectancy') return;
    if (!selectedLifeExpYear || !lifeExpYears.length) return;

    fetch('https://ourworldindata.org/grapher/life-expectancy.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        const lifeExpKey = Object.keys(parsed[0]).find(key =>
          key.toLowerCase().includes('life expectancy')
        );
        if (!lifeExpKey) return;

        const allEntities = [...new Set(parsed.map(d => d.Entity.trim()))];
        const regions = [
          "World", "Africa", "Asia", "Europe", "Americas", "North America", "South America", "Oceania",
          "European Union", "High income", "Low income", "Upper middle income", "Lower middle income"
        ].filter(r => allEntities.includes(r));

        let filteredData;
        if (selectedRegion === 'World' || regions.includes(selectedRegion)) {
          filteredData = parsed
            .filter(d => !regions.includes(d.Entity.trim()) && +d.Year === selectedLifeExpYear)
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[lifeExpKey],
              isCountry: true
            }))
            .filter(d => !isNaN(d.value));
        } else {
          filteredData = parsed
            .filter(d => d.Entity.trim() === selectedRegion)
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[lifeExpKey],
              isCountry: true
            }))
            .filter(d => !isNaN(d.value))
            .sort((a, b) => a.year - b.year);
        }
        setLifeExpData(filteredData);
      })
      .catch(() => {});
  }, [selectedLifeExpYear, selectedRegion, activeGlobeDataset]);

  // Update population data when year/region changes
  useEffect(() => {
    if (activeGlobeDataset !== 'population') return;
    if (!selectedPopulationYear || !populationYears.length) return;

    fetch('https://ourworldindata.org/grapher/population.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        const popKey = Object.keys(parsed[0]).find(key =>
          key.toLowerCase().includes('population') && !key.toLowerCase().includes('density')
        );
        if (!popKey) return;

        const allEntities = [...new Set(parsed.map(d => d.Entity.trim()))];
        const regions = [
          "World", "Africa", "Asia", "Europe", "Americas", "North America", "South America", "Oceania",
          "European Union", "High income", "Low income", "Upper middle income", "Lower middle income"
        ].filter(r => allEntities.includes(r));

        let filteredData;
        if (selectedRegion === 'World' || regions.includes(selectedRegion)) {
          filteredData = parsed
            .filter(d => !regions.includes(d.Entity.trim()) && +d.Year === selectedPopulationYear)
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[popKey],
              population: +d[popKey]
            }))
            .filter(d => !isNaN(d.population));
        } else {
          filteredData = parsed
            .filter(d => d.Entity.trim() === selectedRegion)
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[popKey],
              population: +d[popKey]
            }))
            .filter(d => !isNaN(d.population))
            .sort((a, b) => a.year - b.year);
        }
        setPopulationData(filteredData);
      })
      .catch(() => {});
  }, [selectedPopulationYear, selectedRegion, activeGlobeDataset]);

  // Fetch available datasets (example utility function)
  useEffect(() => {
    const fetchDatasets = async () => {
      setIsLoadingDatasets(true);
      try {
        const datasets = await getAvailableDatasets();
        setAvailableDatasets(datasets);
      } catch (error) {
        // Handle error if needed
      }
      setIsLoadingDatasets(false);
    };
    fetchDatasets();
  }, []);

  // Load dataset for globe
  useEffect(() => {
    if (!activeGlobeDataset) return;
    const loadGlobeData = async () => {
      try {
        setIsLoadingGlobeData(true);
        const data = await loadDataset(activeGlobeDataset);
        if (activeGlobeDataset === 'population') {
          setPopulationData(data);
          const yrs = [...new Set(data.map(d => d.year))];
          setPopulationYears(yrs);
          setSelectedPopulationYear(Math.max(...yrs));
        } else if (activeGlobeDataset === 'life-expectancy') {
          setLifeExpData(data);
        }
      } catch (error) {
        setGlobeDataError(error.message);
      } finally {
        setIsLoadingGlobeData(false);
      }
    };
    loadGlobeData();
  }, [activeGlobeDataset]);

  // Dataset selection
  const handleDatasetSelect = async (datasetId, displayType = 'graph') => {
    setSelectedDataset(datasetId);
    const ds = availableDatasets.find(d => d.id === datasetId);
    if (displayType === 'globe') {
      setIsGlobeReset(false);
      setActiveGlobeDataset(datasetId);
      setShowGlobe(true);
      setShowGraph(false);
      setActiveDataset(null);
    } else {
      setActiveDataset(ds);
      setShowGraph(true);
      setShowGlobe(true);
      setActiveGlobeDataset(null);
    }
  };

  const renderDatasetSelector = () => (
    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
      <h3 className="text-sm font-bold text-neon-blue mb-2">Available Datasets</h3>
      {isLoadingDatasets ? (
        <div className="text-neon-blue">Loading datasets...</div>
      ) : (
        <>
          <select
            className="w-full p-2 rounded bg-gray-800 text-neon-blue border border-neon-blue/20"
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
          >
            <option value="">Select a dataset</option>
            {availableDatasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.title}
              </option>
            ))}
          </select>
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 p-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80 transition-colors"
              onClick={() => selectedDataset && handleDatasetSelect(selectedDataset, 'graph')}
              disabled={!selectedDataset}
            >
              Show Graph
            </button>
            <button
              className="flex-1 p-2 bg-neon-purple text-black rounded hover:bg-neon-purple/80 transition-colors"
              onClick={() => selectedDataset && handleDatasetSelect(selectedDataset, 'globe')}
              disabled={!selectedDataset}
            >
              Show on Globe
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Reset globe
  const handleResetGlobe = () => {
    setActiveGlobeDataset(null);
    setPopulationData([]);
    setLifeExpData([]);
    setSelectedRegion('World');
    setSelectedPopulationYear(null);
    setSelectedLifeExpYear(null);
    setIsGlobeReset(true);
    setGlobeDataError(null);
    const popControls = document.querySelector('#population-controls');
    const lifeControls = document.querySelector('#life-expectancy-controls');
    if (popControls) popControls.style.display = 'none';
    if (lifeControls) lifeControls.style.display = 'none';
  };

  // -------------------------------
  // RENDER
  // -------------------------------
  const sidebarBaseWidth = window.innerWidth <= 768 ? '80' : '20';
  const leftPanelWidth = leftHidden ? '0' : `${sidebarBaseWidth}%`;
  const rightPanelWidth = rightHidden ? '0' : `${sidebarBaseWidth}%`;

  return (
    <div className="relative flex w-screen h-screen text-gray-100 overflow-hidden font-sciFi bg-black">
      <ParticlesBackground show={showParticles} opacity={particlesOpacity} />

      {/* TOP HUD PANEL */}
      <div
        style={{
          height: `${Math.min(dimensions.top, 30)}vh`,
          minHeight: '40px',
          left: !leftHidden ? `${sidebarWidths.left}vw` : '0',
          right: !rightHidden ? `${sidebarWidths.right}vw` : '0',
          margin: '0 5px'
        }}
        className={`absolute top-0 ${
          glowEnabled
            ? 'bg-gradient-to-b from-neon-blue/10 to-transparent border-b border-neon-blue/50'
            : 'bg-gray-900/50 border-b border-gray-600'
        } flex items-center justify-center z-10 backdrop-blur-lg rounded-lg transition-all duration-300`}
      >
        <h1
          className={`text-2xl sm:text-4xl md:text-6xl font-bold tracking-widest ${
            glowEnabled
              ? 'bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent'
              : 'text-green-700'
          } relative px-2 text-center`}
        >
          PLANETARY HUD
        </h1>
        {/* Resize handle for top bar */}
        <div
          className="resize-handle-vertical"
          style={{ bottom: '-6px' }}
          onMouseDown={() => setIsResizing({ ...isResizing, top: true })}
        />
      </div>

      {/* LEFT SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full z-30 ${
          leftHidden ? '-translate-x-full' : 'translate-x-0'
        } backdrop-blur-lg rounded-r-lg`}
        style={{
          width: `${sidebarWidths.left}vw`,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          transition: isResizing.left ? 'none' : 'transform 0.3s ease-in-out'
        }}
      >
        <div className="relative h-full overflow-y-auto" style={{ userSelect: isResizing.left ? 'none' : 'auto' }}>
          {!leftHidden && (
            <>
              <div
                className="flex justify-between items-center cursor-pointer p-2"
                onClick={() => setLeftHidden(true)}
                style={{
                  background: glowEnabled
                    ? 'linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent)'
                    : 'rgba(0, 0, 0, 0.3)',
                  borderBottom: glowEnabled
                    ? '1px solid rgba(0, 230, 255, 0.3)'
                    : '1px solid rgba(128, 128, 128, 0.3)'
                }}
              >
                <h2 className={`text-2xl font-bold ${glowEnabled ? 'text-white glow-text' : 'text-gray-400'}`}>
                  SYSTEM STATS
                </h2>
                <span className={`text-xl ${glowEnabled ? 'text-neon-blue glow-text' : 'text-gray-400'}`}>
                  –
                </span>
              </div>
              <div className="p-6 space-y-6">
                {/* Dataset Selector */}
                {renderDatasetSelector()}

                <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 transition-all">
                  <p className="text-lg">
                    Dominant Species: <br />
                    <span className="text-2xl font-bold text-blue-900">Homo Sapiens</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-gray-400">TECHNOLOGY</h4>
                  {/* Example bars */}
                  <div>
                    <p className={`${glowEnabled ? 'text-neon-purple' : 'text-gray-400'} text-lg mb-2`}>
                      Kardashev Type: 0.4
                    </p>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          glowEnabled
                            ? 'bg-gradient-to-r from-neon-purple to-purple-800'
                            : 'bg-gray-500'
                        }`}
                        style={{ width: '40%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className={`${glowEnabled ? 'text-neon-red' : 'text-gray-400'} text-lg mb-2`}>
                      Energy: 49GW/day
                    </p>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          glowEnabled
                            ? 'bg-gradient-to-r from-neon-red to-red-800'
                            : 'bg-gray-500'
                        }`}
                        style={{ width: '65%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Resize handle for left sidebar */}
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
                style={{ transform: 'translateX(50%)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing((prev) => ({ ...prev, left: true }));
                }}
              />
            </>
          )}
          {!leftHidden && <ScannerEffect show={showScanner} glowIntensity={glowIntensity} />}
        </div>
      </div>
      {leftHidden && (
        <button
          onClick={() => setLeftHidden(false)}
          className="fixed left-1 top-1/2 -translate-y-1/2 bg-gray-800/90 p-2 sm:p-3
            rounded-r-md shadow-lg hover:bg-gray-700 transition-colors z-40
            border border-neon-blue/30"
        >
          &gt;
        </button>
      )}

      {/* CENTER CONTAINER */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{
          marginLeft: !leftHidden ? `${sidebarWidths.left}vw` : '0',
          marginRight: !rightHidden ? `${sidebarWidths.right}vw` : '0',
          transition: 'margin 0.3s ease-in-out'
        }}
      >
        {showGraph && activeDataset ? (
          <GraphComponent
            dataset={activeDataset}
            onClose={() => {
              setShowGraph(false);
              setActiveDataset(null);
              setSelectedDataset("");
              setShowGlobe(true);
            }}
            leftMargin={!leftHidden ? `${sidebarWidths.left}vw` : '0'}
            rightMargin={!rightHidden ? `${sidebarWidths.right}vw` : '0'}
          />
        ) : (
          <div
            className="relative w-full md:w-[800px] aspect-square"
            style={{
              maxWidth: '95vmin',
              opacity: globeOpacity,
              transition: 'opacity 0.3s ease'
            }}
          >
            {showGlobe && (
              <Globe
                key={`globe-${showGlobeTexture}-${updateFPS}-${activeGlobeDataset}-${isGlobeReset ? 'reset' : 'active'}`}
                width={800}
                height={800}
                globeMaterial={computedGlobeMaterial}
                backgroundColor="rgba(0,0,0,0)"
                fpsLimit={updateFPS}
                polygonsData={countries.features.filter((feat) => feat.properties.ISO_A2 !== 'AQ')}
                polygonAltitude={(d) => (d === hoverD ? 0.15 : 0.1)}
                onContextMenu={(e) => e.preventDefault()}
                polygonCapColor={(d) => {
                  if (!d?.properties?.ADMIN) return 'rgba(200,200,200,0.01)';
                  const normalizedCountryName = normalizeCountryName(d.properties.ADMIN.trim());

                  if (isGlobeReset) {
                    return 'rgba(200,200,200,0.01)';
                  }
                  if (activeGlobeDataset === 'life-expectancy' && lifeExpData?.length) {
                    const cData = lifeExpData.find((item) => item.entity.toLowerCase() === normalizedCountryName);
                    if (cData?.value) {
                      const scale = scaleSequentialSqrt(interpolateRdYlGn).domain([45, 85]);
                      const baseColor = scale(cData.value);
                      return baseColor.replace('rgb(', 'rgba(').replace(')', ',0.7)');
                    }
                  }
                  if (activeGlobeDataset === 'population' && populationData?.length) {
                    const cData = populationData.find((item) => {
                      return item.entity.toLowerCase() === normalizedCountryName && item.year === selectedPopulationYear;
                    });
                    if (cData?.value) {
                      const scale = scaleSequentialSqrt(interpolateGreys).domain([1e6, 1.5e9]);
                      const baseColor = scale(cData.value);
                      return baseColor.replace('rgb(', 'rgba(').replace(')', ',0.7)');
                    }
                  }
                  return 'rgba(200,200,200,0.01)';
                }}
                polygonSideColor={() => 'rgba(150,150,150,0.1)'}
                polygonStrokeColor={(d) => (d === hoverD ? 'rgba(57,255,20,1)' : 'rgba(57,255,20,0.3)')}
                onPolygonHover={handleHover}
                showGraticules={showGraticules}
                showAtmosphere={showAtmosphere}
                onGlobeReady={onGlobeReady}
                showTexture={showGlobeTexture}
              />
            )}
            {isLoadingGlobeData && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="text-neon-blue">Loading data...</div>
              </div>
            )}
            {globeDataError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="text-neon-red">Error: {globeDataError}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoverD && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x + 20}px`,
            top: `${tooltipPosition.y - 20}px`,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            zIndex: 9999,
            borderLeft: '3px solid rgba(57,255,20,0.8)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
            minWidth: '200px'
          }}
        >
          <div className="font-bold text-lg">{hoverD.properties.ADMIN}</div>
          {activeGlobeDataset === 'life-expectancy' && (
            <div className="text-sm text-gray-300">
              Life Expectancy:{' '}
              {lifeExpData
                .find(
                  (item) =>
                    item.entity.toLowerCase() ===
                    normalizeCountryName(hoverD.properties.ADMIN.toLowerCase())
                )
                ?.value?.toFixed(1) || 'N/A'}{' '}
              years
            </div>
          )}
          {activeGlobeDataset === 'population' && (
            <div className="text-sm text-gray-300">
              Population:{' '}
              {new Intl.NumberFormat().format(
                populationData?.find(
                  (item) =>
                    item.entity.toLowerCase() ===
                      normalizeCountryName(hoverD.properties.ADMIN.toLowerCase()) &&
                    item.year === selectedPopulationYear
                )?.value || 'N/A'
              )}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">
            Region: {hoverD.properties.REGION_WB || hoverD.properties.CONTINENT || 'N/A'}
          </div>
        </div>
      )}

      {/* Life Expectancy Controls */}
      {!showGraph && activeGlobeDataset === 'life-expectancy' && lifeExpYears.length > 0 && (
        <div
          id="life-expectancy-controls"
          className="fixed bottom-[25vh] left-1/2 transform -translate-x-1/2 z-50
            bg-gray-900/80 backdrop-blur-md p-3 rounded-lg border border-neon-blue/30"
          style={{ width: '350px' }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            const el = e.currentTarget;
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
          }}
        >
          <button
            className="absolute top-1 right-1 text-neon-blue/50 hover:text-neon-blue"
            onClick={() => {
              const panel = document.querySelector('#life-expectancy-controls');
              if (panel) panel.style.display = 'none';
            }}
          >
            ✕
          </button>
          <div className="mb-2">
            <label className="text-neon-blue text-xs block mb-1">Region/Country:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-1 bg-gray-800 text-neon-blue border border-neon-blue/20 rounded text-xs"
            >
              {availableRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-neon-blue text-xs">
              Year: {selectedLifeExpYear}
            </span>
            <span className="text-neon-blue text-xs">Life Expectancy</span>
          </div>
          <input
            type="range"
            min={Math.min(...lifeExpYears)}
            max={Math.max(...lifeExpYears)}
            value={selectedLifeExpYear}
            onChange={(e) => setSelectedLifeExpYear(+e.target.value)}
            step="1"
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{Math.min(...lifeExpYears)}</span>
            <span>{Math.max(...lifeExpYears)}</span>
          </div>
        </div>
      )}

      {/* Population Controls */}
      {!showGraph && activeGlobeDataset === 'population' && populationYears.length > 0 && (
        <div
          id="population-controls"
          className="fixed bottom-[25vh] left-1/2 transform -translate-x-1/2 z-50
            bg-gray-900/80 backdrop-blur-md p-3 rounded-lg border border-neon-blue/30"
          style={{ width: '350px' }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            const el = e.currentTarget;
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
          }}
        >
          <button
            className="absolute top-1 right-1 text-neon-blue/50 hover:text-neon-blue"
            onClick={() => {
              const panel = document.querySelector('#population-controls');
              if (panel) panel.style.display = 'none';
            }}
          >
            ✕
          </button>
          <div className="mb-2">
            <label className="text-neon-blue text-xs block mb-1">Region/Country:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-1 bg-gray-800 text-neon-blue border border-neon-blue/20 rounded text-xs"
            >
              {availableRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-neon-blue text-xs">Year: {selectedPopulationYear}</span>
            <span className="text-neon-blue text-xs">Population</span>
          </div>
          <input
            type="range"
            min={Math.min(...populationYears)}
            max={Math.max(...populationYears)}
            value={selectedPopulationYear}
            onChange={(e) => setSelectedPopulationYear(+e.target.value)}
            step="1"
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{Math.min(...populationYears)}</span>
            <span>{Math.max(...populationYears)}</span>
          </div>
        </div>
      )}

      {/* Globe Reset Button */}
      {!isGlobeReset && !showGraph && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={handleResetGlobe}
            className="px-4 py-2 bg-gray-800/80 backdrop-blur-md text-neon-red
              border border-neon-red/30 rounded-lg hover:bg-gray-700/80 transition-colors
              flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 2v6h6"></path>
              <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
            </svg>
            Reset Globe
          </button>
        </div>
      )}

      {/* BOTTOM HUD */}
      <div
        style={{
          height: `${Math.min(dimensions.bottom, 15)}vh`,
          minHeight: '30px',
          left: !leftHidden ? `${sidebarWidths.left}vw` : '0',
          right: !rightHidden ? `${sidebarWidths.right}vw` : '0',
          margin: '0 5px',
          bottom: '5px'
        }}
        className={`fixed z-20 ${
          glowEnabled ? 'bg-gray-800/30 border-t border-neon-red/50' : 'bg-gray-900/50 border-t border-gray-600'
        } flex items-center justify-center backdrop-blur-lg rounded-lg transition-all duration-300`}
      >
        <div className="text-xs sm:text-sm md:text-xl flex flex-wrap gap-1 sm:gap-2 md:gap-8 p-1 sm:p-2 justify-center">
          <span className="text-orange-900">⚠️ CRITICAL:</span>
          <span className="text-red-900">THERMAL</span>
          <span className="text-red-900">BIOSPHERE</span>
          <span className="text-red-900">RESOURCES</span>
        </div>
        <div
          className="resize-handle-vertical"
          style={{
            position: 'absolute',
            top: '-6px',
            left: 0,
            right: 0,
            height: '12px',
            cursor: 'ns-resize'
          }}
          onMouseDown={() => setIsResizing({ ...isResizing, bottom: true })}
        />
      </div>

      {/* RIGHT SIDEBAR */}
      <div
        className={`fixed top-0 right-0 h-full z-30 ${
          rightHidden ? 'translate-x-full' : 'translate-x-0'
        } backdrop-blur-lg rounded-l-lg`}
        style={{
          width: `${sidebarWidths.right}vw`,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          transition: isResizing.right ? 'none' : 'transform 0.3s ease-in-out'
        }}
      >
        <div className="relative h-full overflow-y-auto" style={{ userSelect: isResizing.right ? 'none' : 'auto' }}>
          {!rightHidden && (
            <>
              <div
                className="flex justify-between items-center cursor-pointer p-2"
                onClick={() => setRightHidden(true)}
                style={{
                  background: glowEnabled
                    ? 'linear-gradient(to left, rgba(0, 0, 0, 0.5), transparent)'
                    : 'rgba(0, 0, 0, 0.3)',
                  borderBottom: glowEnabled
                    ? '1px solid rgba(0, 230, 255, 0.3)'
                    : '1px solid rgba(128, 128, 128, 0.3)'
                }}
              >
                <h2 className={`text-2xl font-bold ${glowEnabled ? 'text-white glow-text' : 'text-gray-400'}`}>
                  MISSION CONTROL
                </h2>
                <span className={`text-xl ${glowEnabled ? 'text-neon-blue glow-text' : 'text-gray-400'}`}>
                  –
                </span>
              </div>
              <div className="p-6 space-y-6">
                {[
                  { label: 'I. Quantum Gravity Theory', color: 'neon-purple', progress: 40 },
                  { label: 'II. Genomic Decryption', color: 'neon-orange', progress: 65 },
                  { label: 'III. Fusion Ignition', color: 'neon-red', progress: 80 },
                  { label: 'IV. Neural Singularity', color: 'neon-green', progress: 25 },
                ].map((quest, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.2 }}
                    className={`group relative p-4 rounded-lg border transition-all ${
                      glowEnabled
                        ? 'border-neon-purple/20 hover:border-neon-purple/50'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <p className={`text-lg ${glowEnabled ? 'text-neon-blue' : 'text-blue-900'}`}>
                      <span className={`${glowEnabled ? 'glow-text' : ''}`}>
                        {quest.label}
                      </span>
                    </p>
                    <div className="h-1 bg-gray-700 rounded-full">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          glowEnabled ? `bg-gradient-to-r from-${quest.color}` : 'bg-gray-500'
                        }`}
                        style={{ width: `${quest.progress}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h4 className="text-xl font-bold mb-4">Globe Appearance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    className={`p-2 rounded-lg ${
                      globeTextureType === 'day' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'
                    }`}
                    onClick={() => setGlobeTextureType('day')}
                  >
                    Day Mode
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    className={`p-2 rounded-lg ${
                      globeTextureType === 'night' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-gray-800/40 text-gray-300'
                    }`}
                    onClick={() => setGlobeTextureType('night')}
                  >
                    Night Mode
                  </motion.button>
                </div>
              </motion.div>
              {/* Resize handle for right sidebar */}
              <div
                className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
                style={{ transform: 'translateX(-50%)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing((prev) => ({ ...prev, right: true }));
                }}
              />
            </>
          )}
          {!rightHidden && <ScannerEffect show={showScanner} glowIntensity={glowIntensity} />}
        </div>
      </div>
      {rightHidden && (
        <button
          onClick={() => setRightHidden(false)}
          className="fixed right-1 top-1/2 -translate-y-1/2 bg-gray-800/90 p-2 sm:p-3
            rounded-l-md shadow-lg hover:bg-gray-700 transition-colors z-40
            border border-neon-blue/30"
        >
          &lt;
        </button>
      )}

      {/* Glow overlay */}
      <GlowOverlay enabled={glowEnabled} />

      {/* Settings Gear */}
      <div className="fixed top-4 right-4 z-[9999]">
        <motion.button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1 rounded-full hover:bg-gray-900/20 backdrop-blur-lg transition-all ${
            glowEnabled ? '' : 'text-gray-400'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 sm:w-8 sm:h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke={glowEnabled ? '#00f3ff' : '#94a3b8'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 
                     2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 
                     1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 
                     2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4
                     a1.65 1.65 0 0 0-1.82.33l-.06.06
                     a2 2 0 0 1-2.83 0 
                     2 2 0 0 1 0-2.83l.06-.06
                     a1.65 1.65 0 0 0 .33-1.82
                     1.65 1.65 0 0 0-1.51-1H3
                     a2 2 0 0 1-2-2
                     2 2 0 0 1 2-2h.09
                     A1.65 1.65 0 0 0 4.6 9
                     a1.65 1.65 0 0 0-.33-1.82l-.06-.06
                     a2 2 0 0 1 0-2.83
                     2 2 0 0 1 2.83 0l.06.06
                     a1.65 1.65 0 0 0 1.82.33H9
                     a1.65 1.65 0 0 0 1-1.51V3
                     a2 2 0 0 1 2-2
                     2 2 0 0 1 2 2v.09
                     a1.65 1.65 0 0 0 1 1.51
                     1.65 1.65 0 0 0 1.82-.33l.06-.06
                     a2 2 0 0 1 2.83 0
                     2 2 0 0 1 0 2.83l-.06.06
                     a1.65 1.65 0 0 0-.33 1.82V9
                     a1.65 1.65 0 0 0 1.51 1H21
                     a2 2 0 0 1 2 2
                     2 2 0 0 1-2 2h-.09
                     a1.65 1.65 0 0 0-1.51 1z"
            ></path>
          </svg>
        </motion.button>

        {showSettings && (
          <Portal>
            <div
              className={`fixed top-[3.5rem] right-4 w-64 max-w-[90vw] ${
                glowEnabled ? 'border border-neon-blue/50' : 'border border-gray-600'
              } bg-gray-900/95 rounded-lg shadow-2xl backdrop-blur-xl p-4 z-[99999]`}
              style={{ maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div className="space-y-4">
                {/* Glow Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Glow Effects</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={glowEnabled}
                      onChange={(e) => setGlowEnabled(e.target.checked)}
                      disabled={lowPowerMode}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Update FPS */}
                <div className="space-y-2">
                  <span className="text-sm text-neon-blue block">Update Rate</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUpdateFPS(1)}
                      className={`flex-1 p-2 rounded-lg ${
                        updateFPS === 1 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      1 FPS
                    </button>
                    <button
                      onClick={() => setUpdateFPS(24)}
                      className={`flex-1 p-2 rounded-lg ${
                        updateFPS === 24 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      24 FPS
                    </button>
                    <button
                      onClick={() => setUpdateFPS(60)}
                      className={`flex-1 p-2 rounded-lg ${
                        updateFPS === 60 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      60 FPS
                    </button>
                  </div>
                </div>
                {/* Scanner & Particles */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Scanner Effect</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showScanner}
                      onChange={(e) => setShowScanner(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Particles</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showParticles}
                      onChange={(e) => setShowParticles(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-neon-blue">Particles Density</span>
                    <span className="text-xs text-neon-purple">{Math.round(particlesOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={particlesOpacity}
                    onChange={(e) => setParticlesOpacity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                {/* Rotation & CPU */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Auto Rotation</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={rotationEnabled}
                      onChange={(e) => setRotationEnabled(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">CPU Monitor</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={enableCpuMonitor}
                      onChange={(e) => setEnableCpuMonitor(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                {enableCpuMonitor && (
                  <div className="text-xs text-neon-purple">
                    System Load: {cpuUsage.toFixed(1)}%
                  </div>
                )}
                {/* Globe */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Globe Visibility</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showGlobe}
                      onChange={(e) => setShowGlobe(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Power Save Mode</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={lowPowerMode}
                      onChange={(e) => setLowPowerMode(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Globe Texture</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showGlobeTexture}
                      onChange={(e) => setShowGlobeTexture(e.target.checked)}
                      disabled={lowPowerMode}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Globe Opacity</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globeOpacity > 0.5}
                      onChange={(e) => setGlobeOpacity(e.target.checked ? 1 : 0.5)}
                      disabled={lowPowerMode}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-neon-blue block">Globe Material</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMaterialType('phong')}
                      className={`flex-1 p-2 rounded-lg ${
                        materialType === 'phong' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      Phong
                    </button>
                    <button
                      onClick={() => setMaterialType('lambert')}
                      className={`flex-1 p-2 rounded-lg ${
                        materialType === 'lambert' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      Lambert
                    </button>
                    <button
                      onClick={() => setMaterialType('basic')}
                      className={`flex-1 p-2 rounded-lg ${
                        materialType === 'basic' ? 'bg-neon-red/20 text-neon-red' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      Basic
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Lat/Lon Grid</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showGraticules}
                      onChange={(e) => setShowGraticules(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Atmosphere Glow</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showAtmosphere}
                      onChange={(e) => setShowAtmosphere(e.target.checked)}
                      disabled={lowPowerMode}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </div>
    </div>
  );
}
