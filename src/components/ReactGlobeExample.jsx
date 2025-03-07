/**
 * ReactGlobeExample.jsx
 *
 * This component renders an interactive 3D globe with a futuristic HUD.
 *
 * Major changes in this version:
 * 1. The default material remains "basic" (which shows a visible texture).
 * 2. An update rate selection (1/24/60 FPS) is available for auto‑rotation.
 * 3. Power Saver Mode is on by default; when active, it forces glow effects, atmosphere glow,
 *    and globe texture off (and disables their toggles).
 * 4. Left and right sidebars are always rendered with reserved widths (from dimensions.left/right)
 *    so that the center container remains centered. When "collapsed,", the sidebar content is hidden
 *    and replaced with a small toggle button (">" for left, "<" for right), but the container's width
 *    remains unchanged.
 * 5. The bottom HUD panel is always visible and resizable.
 * 6. Gear settings content is scrollable.
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
import Globe from './Globe';  // Import our new Globe component
import { scaleSequentialSqrt } from 'd3-scale';
import { interpolateYlOrRd, interpolateRdYlGn, interpolateGreys } from 'd3-scale-chromatic';
import { csvParse } from 'd3-dsv';
//import loadDataset from '../utils/loadDataset';
import { loadDataset, getAvailableDatasets } from '../utils/loadDataset';

export default function ReactGlobeExample() {
  // -------------------------------
  // REFS & STATE DECLARATIONS
  // -------------------------------
  const globeRef = useRef(null);
  const [countries, setCountries] = useState({ features: [] });
  const [hoverD, setHoverD] = useState(null);

  // Initialize top and bottom panel heights with 60px (as a percentage of window height)
  const initialPanelHeight = typeof window !== 'undefined' ? (60 / window.innerHeight) * 100 : 10;
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

  // Update width calculations for sidebars to use consistent units
  const [sidebarWidths, setSidebarWidths] = useState({
    left: window.innerWidth <= 768 ? (window.innerWidth > window.innerHeight ? 15 : 80) : 20,
    right: window.innerWidth <= 768 ? (window.innerWidth > window.innerHeight ? 15 : 80) : 20
  });

  // UI and performance states
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(1); // 0–1
  const [particlesOpacity, setParticlesOpacity] = useState(1);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [cpuUsage, setCpuUsage] = useState(0);
  const [enableCpuMonitor, setEnableCpuMonitor] = useState(false);
  const [activeDataset, setActiveDataset] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showGlobe, setShowGlobe] = useState(true);
  const [showGraticules, setShowGraticules] = useState(false);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [globeTextureType, setGlobeTextureType] = useState('night');
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  // NEW: Cache preloaded population data
  const [populationData, setPopulationData] = useState(null);

  // NEW: Material type tri‑toggle (phong/lambert/basic). Default is "basic".
  const [materialType, setMaterialType] = useState('basic');

  // NEW: Update rate selection (1/24/60 FPS). Default is now 1 FPS.
  const [updateFPS, setUpdateFPS] = useState(1);

  // NEW: Collapse state for sidebars.
  const [leftHidden, setLeftHidden] = useState(false);
  const [rightHidden, setRightHidden] = useState(false);

  // The left/right containers always use the same width (from dimensions) regardless of collapse state.
  // (When collapsed, their internal content is hidden/replaced by a toggle button.)
  const sidebarBaseWidth = window.innerWidth <= 768 ? '80' : '20';
  const leftPanelWidth = leftHidden ? '0' : `${sidebarBaseWidth}%`;
  const rightPanelWidth = rightHidden ? '0' : `${sidebarBaseWidth}%`;

  // -------------------------------
  // REFS for custom auto‑rotation (throttled to chosen FPS)
  // -------------------------------
  const isUserInteracting = useRef(false);
  const autoRotateAnimationId = useRef(null);
  const autoRotateLastTime = useRef(null);

  // NEW: Added for the new dataset selection logic
  const [selectedDataset, setSelectedDataset] = useState("");

  // NEW: State for unifying dataset selection (Life Expectancy or Population)
  const [selectedGlobeDataset, setSelectedGlobeDataset] = useState('life-expectancy-2023');

  // NEW: Added for the new globe view logic
  const [showGlobeView, setShowGlobeView] = useState(true);
  const [activeGlobeDataset, setActiveGlobeDataset] = useState(null);

  // NEW: Store the life expectancy CSV data for 2023.
  const [lifeExpData, setLifeExpData] = useState([]);
  // NEW: Store the merged GeoJSON (polygons enriched with life expectancy values).
  const [mergedGeo, setMergedGeo] = useState({ features: [] });
  // NEW: Flag to toggle which overlay attribute is displayed: default or life expectancy.
  const [displayAttribute, setDisplayAttribute] = useState('default'); // 'lifeExp' for life expectancy

  // NEW: State flag to trigger the test: highlight Germany in red.
  const [highlightGermany, setHighlightGermany] = useState(false);

  // State for dataset years and selected year
  const [populationYears, setPopulationYears] = useState([]);
  const [selectedPopulationYear, setSelectedPopulationYear] = useState(null);
  
  // Add state for life expectancy years
  const [lifeExpYears, setLifeExpYears] = useState([]);
  const [selectedLifeExpYear, setSelectedLifeExpYear] = useState(null);
  
  // Add state for country/region selection
  const [availableRegions, setAvailableRegions] = useState(['World']);
  const [selectedRegion, setSelectedRegion] = useState('World');

  // Rename state variable for clarity
  const [globeOpacity, setGlobeOpacity] = useState(1); // Default to opaque

  // Add state for texture visibility
  const [showGlobeTexture, setShowGlobeTexture] = useState(true);

  // Add state for tooltip position
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Add new state for available datasets
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  // Add loading states
  const [isLoadingGlobeData, setIsLoadingGlobeData] = useState(false);
  const [globeDataError, setGlobeDataError] = useState(null);

  // -------------------------------
  // CUSTOM AUTO ROTATION FUNCTIONS
  // -------------------------------
  const startAutoRotate = () => {
    if (autoRotateAnimationId.current !== null) return; // Prevent multiple loops
    let lastTime = performance.now();
    const BASE_SPEED = 0.0008; // Rotation speed per millisecond
    const animate = (time) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      if (rotationEnabled) { // Only update if auto-rotate is enabled
        if (globeRef.current) {
          const currentPOV = globeRef.current.pointOfView();
          const newLng = currentPOV.lng - BASE_SPEED * deltaTime;
          // Directly update pointOfView for continuous rotation
          globeRef.current.pointOfView({ ...currentPOV, lng: newLng });
        }
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

  // -------------------------------
  // EFFECT: Control auto‑rotation.
  // -------------------------------
  useEffect(() => {
    if (!globeRef.current) return;
    // If auto-rotate is enabled, start the continuous animation loop
    if (rotationEnabled) {
      startAutoRotate();
    } else {
      // If auto-rotate is off and user is not interacting, cancel the animation loop to save CPU
      if (!isUserInteracting.current && autoRotateAnimationId.current !== null) {
        cancelAnimationFrame(autoRotateAnimationId.current);
        autoRotateAnimationId.current = null;
      }
    }
  }, [rotationEnabled]);

  // -------------------------------
  // refreshGlobe: One-time update (triggered on hover/click when auto‑rotation is off)
  // -------------------------------
  const refreshGlobe = () => {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView();
      globeRef.current.pointOfView(pov, 33);
    }
  };

  // -------------------------------
  // EFFECT: Fetch country GeoJSON data.
  // -------------------------------
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((err) => console.error('Error loading GeoJSON:', err));
  }, []);

  // -------------------------------
  // Memoized maximum value (example computation).
  // -------------------------------
  const maxVal = useMemo(() => {
    const getVal = (f) =>
      f.properties?.GDP_MD_EST / Math.max(1e5, f.properties?.POP_EST || 1) || 0;
    return Math.max(...countries.features.map(getVal));
  }, [countries]);

  // -------------------------------
  // useMemo: Compute globe material based on materialType.
  // -------------------------------
  const computedGlobeMaterial = useMemo(() => {
    return {
      isNightTexture: globeTextureType === 'night',
      color: 0xffffff,
      opacity: globeOpacity,
      transparent: true,
      bumpScale: 0.3,
      shininess: materialType === 'phong' ? 1 : undefined,
      emissive: (materialType === 'phong' || materialType === 'lambert') ? new THREE.Color(0xffffff) : undefined,
      emissiveIntensity: (materialType === 'phong' || materialType === 'lambert') ? 0.3 : undefined
    };
  }, [materialType, globeTextureType, globeOpacity]);

  // -------------------------------
  // EFFECT: When power saver mode is on, disable glow, atmosphere, and textures
  useEffect(() => {
    if (lowPowerMode) {
      setGlowEnabled(false);
      setShowAtmosphere(false);
      setGlobeOpacity(0.5);
      setShowGlobeTexture(false);
    }
  }, [lowPowerMode]);

  // -------------------------------
  // EFFECT: Setup panel resizing listeners.
  // -------------------------------
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing.left) {
        const newWidth = Math.max(15, Math.min((e.clientX / window.innerWidth) * 100, 40));
        setSidebarWidths(prev => ({ ...prev, left: newWidth }));
      }
      if (isResizing.right) {
        const newWidth = Math.max(15, Math.min(((window.innerWidth - e.clientX) / window.innerWidth) * 100, 40));
        setSidebarWidths(prev => ({ ...prev, right: newWidth }));
      }
      if (isResizing.top) {
        const newTop = (e.clientY / window.innerHeight) * 100;
        setDimensions(d => ({ ...d, top: Math.max(5, Math.min(newTop, 30)) }));
      }
      if (isResizing.bottom) {
        const newBottom = ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
        setDimensions(d => ({ ...d, bottom: Math.max(5, Math.min(newBottom, 20)) }));
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

  // -------------------------------
  // EFFECT: Listen for document visibility changes.
  // -------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => { /* Optional: pause/resume animations */ };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // -------------------------------
  // EFFECT: Initialize OrbitControls for manual interaction.
  // -------------------------------
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
    // On user interaction start, simply mark that the user is interacting
    controls.addEventListener('start', () => {
      isUserInteracting.current = true;
    });
    // On interaction end, mark flag false; auto-rotation effect will handle restarting if needed
    controls.addEventListener('end', () => {
      isUserInteracting.current = false;
    });
    return () => { controls.dispose(); };
  }, [isGlobeReady, rotationEnabled]);

  // -------------------------------
  // onGlobeReady: Set flag.
  // -------------------------------
  const onGlobeReady = () => {
    // Set the state flag indicating the globe is ready
    setIsGlobeReady(true);
    
    // Check if the globe instance (wrapped by react-globe.gl) exposes a debug method.
    // This debug method is provided by our forked three-globe and will enable debug logging.
    if (globeRef.current && typeof globeRef.current.debug === 'function') {
      console.info('[globe-kapsule] Debug mode enabled.'); // Log debug info
      globeRef.current.debug(true); // Toggle debug logging in the underlying three-globe instance
    } else {
      console.warn('[globe-kapsule] Debug method is not available on the globe instance. Ensure your forked changes are applied correctly.');
    }
  };

  // -------------------------------
  // EFFECT: CPU Load Monitoring (if enabled).
  // -------------------------------
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
    return () => { if (rafId) cancelAnimationFrame(rafId); setCpuUsage(0); };
  }, [enableCpuMonitor]);

  // -------------------------------
  // Handler: Update polygon opacity on hover.
  // -------------------------------
  const handleHover = useCallback((hoveredCountry, event) => {
    console.log('[ReactGlobeExample] handleHover:', { 
      country: hoveredCountry?.properties?.ADMIN, 
      hasEvent: !!event,
      coords: event ? `${event.clientX},${event.clientY}` : 'none'
    });

    // Always update hoverD state
    setHoverD(hoveredCountry);

    // Update tooltip position if we have both country and event
    if (event) {
      setTooltipPosition({
        x: event.clientX,
        y: event.clientY
      });
    }
  }, []);

  // Helper function to add green highlight
  const addGreenHighlight = (baseColor) => {
    const c = new THREE.Color(baseColor);
    c.r = Math.min(1, c.r + 0.2);
    c.g = Math.min(1, c.g + 0.4);
    c.b = Math.min(1, c.b + 0.2);
    return c.getStyle();
  };

  // -------------------------------
  // FETCH & MERGE DATA
  // -------------------------------
  // 2. Fetch the life expectancy CSV for 2023.
  useEffect(() => {
    // Fetch the full CSV (no filtered query parameters)
    fetch('https://ourworldindata.org/grapher/life-expectancy.csv')
      .then(res => res.text())
      .then(csvText => {
        console.log('CSV Header:', csvText.split("\n")[0]);
        const parsed = csvParse(csvText);
        if (!parsed.length) {
          console.error('CSV parsed is empty');
          return;
        }
        // Identify the column that contains "life expectancy" (case-insensitive)
        const lifeExpKey = Object.keys(parsed[0]).find(key => key.toLowerCase().includes('life expectancy'));
        if (!lifeExpKey) {
          console.error("No column matching 'life expectancy' found in CSV.");
          return;
        }
        // Extract all entities including regions
        const allEntities = [...new Set(parsed.map(d => d.Entity.trim()))];
        
        // Identify regions and continents
        const regions = [
          "World", "Africa", "Asia", "Europe", "Americas", "North America", "South America", "Oceania",
          "European Union", "High income", "Low income", "Upper middle income", "Lower middle income"
        ].filter(r => allEntities.includes(r));
        
        // Update available regions
        setAvailableRegions(['World', ...regions.filter(r => r !== 'World'), ...allEntities.filter(e => !regions.includes(e)).sort()]);
        
        // Don't filter out regions anymore, we'll use them
        let filteredData = parsed;
        
        // Get available years and sort them
        const availableYears = [...new Set(filteredData.map(d => +d.Year).filter(year => !isNaN(year)))];
        availableYears.sort((a, b) => a - b);
        console.log('Available years for life expectancy:', availableYears);
        setLifeExpYears(availableYears);
        
        // Select earliest year available to show historical data (default to 1950 if available)
        const defaultYear = availableYears.find(y => y >= 1950) || availableYears[0];
        setSelectedLifeExpYear(defaultYear);
        
        // Filter to the selected year
        const yearFiltered = filteredData.filter(d => +d.Year === defaultYear);
        
        // For the globe view, we need country-level data
        let result;
        if (selectedRegion === 'World' || regions.includes(selectedRegion)) {
          // If a region is selected, show all countries (for the globe)
          result = yearFiltered
            .filter(d => !regions.includes(d.Entity.trim())) // only countries for the globe
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[lifeExpKey],
              isCountry: true
            }))
            .filter(d => !isNaN(d.value));
        } else {
          // If a specific country is selected, only show that country
          result = yearFiltered
            .filter(d => d.Entity.trim() === selectedRegion)
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[lifeExpKey],
              isCountry: true
            }))
            .filter(d => !isNaN(d.value));
        }
        
        console.log(`Filtered life expectancy data for year ${defaultYear}:`, result.slice(0, 5));
        setLifeExpData(result);
      })
      .catch(err => console.error('Error loading life expectancy CSV:', err));
  }, []);

  // -------------------------------
  // New useEffect to fetch population data
  // -------------------------------
  useEffect(() => {
    // Fetch population CSV data
    fetch('https://ourworldindata.org/grapher/population.csv')
      .then(res => res.text())
      .then(csvText => {
        console.log('Population CSV Header:', csvText.split("\n")[0]);
        const parsed = csvParse(csvText);
        if (!parsed.length) {
          console.error('Population CSV parsed is empty');
          return;
        }
        // Identify the population column (ignore columns that mention life expectancy)
        const popKey = Object.keys(parsed[0]).find(key => key.toLowerCase().includes('population') && key.toLowerCase().indexOf('life') === -1);
        if (!popKey) {
          console.error("No column matching 'population' found in CSV.");
          return;
        }
        // Define aggregates to skip
        const aggregates = new Set([
          "World", "Africa", "Asia", "Europe", "Americas", "Oceania",
          "European Union", "High income", "Low income", "Upper middle income", "Lower middle income"
        ]);
        let filteredPop = parsed.filter(d => !aggregates.has(d.Entity.trim()));
        // Get available years and sort them
        const availableYears = [...new Set(filteredPop.map(d => +d.Year).filter(year => !isNaN(year)))];
        console.log('Available population years:', availableYears);
        availableYears.sort((a, b) => a - b);
        setPopulationYears(availableYears);
        // Set default selected year as the maximum available
        const defaultYear = Math.max(...availableYears);
        setSelectedPopulationYear(defaultYear);
        // Filter to records for the default year
        filteredPop = filteredPop.filter(d => +d.Year === defaultYear);
        const result = filteredPop.map(d => ({
          entity: d.Entity.trim(),
          year: +d.Year,
          population: +d[popKey]
        })).filter(d => !isNaN(d.population));
        console.log('Filtered population data:', result);
        setPopulationData(result);
      })
      .catch(err => console.error('Error loading population CSV:', err));
  }, []);

  // DEBUG: Log the updateFPS value as the fpsLimit prop for our custom FPS throttling
  useEffect(() => {
    console.log('DEBUG: updateFPS (fpsLimit) value:', updateFPS);
  }, [updateFPS]);

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      const isLandscape = window.innerWidth > window.innerHeight;

      setSidebarWidths({
        left: isMobile ? (isLandscape ? 15 : 80) : 20,
        right: isMobile ? (isLandscape ? 15 : 80) : 20
      });

      // Update dimensions based on screen orientation and size
      setDimensions(prev => ({
        ...prev,
        left: isMobile ? (isLandscape ? 15 : 0) : 20,
        right: isMobile ? (isLandscape ? 15 : 0) : 20,
        top: isMobile ? 10 : prev.top,
        bottom: isMobile ? 8 : prev.bottom,
      }));

      // Auto-hide sidebars in portrait mode
      if (isMobile && !isLandscape) {
        setLeftHidden(true);
        setRightHidden(true);
      } else if (isMobile && isLandscape) {
        // Show sidebars in landscape if they were hidden due to portrait mode
        setLeftHidden(false);
        setRightHidden(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100);
    });
    handleResize(); // Initial call
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Add effect to update life expectancy data when year or region changes
  useEffect(() => {
    if ((!selectedLifeExpYear || lifeExpYears.length === 0) && activeGlobeDataset === 'life-expectancy') return;
    if (activeGlobeDataset !== 'life-expectancy') return;
    
    // Fetch full life expectancy data for the selected year
    fetch('https://ourworldindata.org/grapher/life-expectancy.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        
        // Find life expectancy column
        const lifeExpKey = Object.keys(parsed[0]).find(key => 
          key.toLowerCase().includes('life expectancy')
        );
        if (!lifeExpKey) return;
        
        // Extract all entities for regions list
        const allEntities = [...new Set(parsed.map(d => d.Entity.trim()))];
        
        // Identify regions
        const regions = [
          "World", "Africa", "Asia", "Europe", "Americas", "North America", "South America", "Oceania",
          "European Union", "High income", "Low income", "Upper middle income", "Lower middle income"
        ].filter(r => allEntities.includes(r));
        
        // Get data based on selected region and year
        let filteredData;
        
        if (selectedRegion === 'World' || regions.includes(selectedRegion)) {
          // For globe view, we need country data (not regions)
          if (activeGlobeDataset === 'life-expectancy') {
            filteredData = parsed
              .filter(d => !regions.includes(d.Entity.trim()) && +d.Year === selectedLifeExpYear)
              .map(d => ({
                entity: d.Entity.trim(),
                year: +d.Year,
                value: +d[lifeExpKey]
              }))
              .filter(d => !isNaN(d.value) && d.value > 0);
          } else {
            // For graph view of a region
            filteredData = parsed
              .filter(d => d.Entity.trim() === selectedRegion && +d.Year >= 1950)
              .map(d => ({
                entity: d.Entity.trim(),
                year: +d.Year,
                value: +d[lifeExpKey]
              }))
              .filter(d => !isNaN(d.value) && d.value > 0)
              .sort((a, b) => a.year - b.year);
          }
        } else {
          // Specific country is selected
          filteredData = parsed
            .filter(d => d.Entity.trim() === selectedRegion && 
                     (+d.Year === selectedLifeExpYear || !activeGlobeDataset || activeGlobeDataset !== 'life-expectancy'))
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[lifeExpKey]
            }))
            .filter(d => !isNaN(d.value) && d.value > 0)
            .sort((a, b) => a.year - b.year);
        }
        
        console.log(`Filtered life expectancy data for ${selectedRegion}, year ${selectedLifeExpYear}:`, 
                   filteredData.slice(0, 5));
        setLifeExpData(filteredData);
      })
      .catch(err => console.error('Error updating life expectancy data:', err));
  }, [selectedLifeExpYear, selectedRegion, activeGlobeDataset]);
  
  // Add effect to update population data when year or region changes
  useEffect(() => {
    if ((!selectedPopulationYear || populationYears.length === 0) && activeGlobeDataset === 'population') return;
    if (activeGlobeDataset !== 'population') return;
    
    // Fetch full population data for the selected year
    fetch('https://ourworldindata.org/grapher/population.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        
        // Find the population column
        const popKey = Object.keys(parsed[0]).find(key => 
          key.toLowerCase().includes('population') && !key.toLowerCase().includes('density')
        );
        if (!popKey) return;
        
        // Extract all entities for regions list
        const allEntities = [...new Set(parsed.map(d => d.Entity.trim()))];
        
        // Identify regions
        const regions = [
          "World", "Africa", "Asia", "Europe", "Americas", "North America", "South America", "Oceania",
          "European Union", "High income", "Low income", "Upper middle income", "Lower middle income"
        ].filter(r => allEntities.includes(r));
        
        // Get data based on selected region and year
        let filteredData;
        
        if (selectedRegion === 'World' || regions.includes(selectedRegion)) {
          // For globe view, we need country data (not regions)
          filteredData = parsed
            .filter(d => !regions.includes(d.Entity.trim()) && +d.Year === selectedPopulationYear)
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[popKey]
            }))
            .filter(d => !isNaN(d.value) && d.value > 0);
        } else {
          // Specific country is selected
          filteredData = parsed
            .filter(d => d.Entity.trim() === selectedRegion)
            .map(d => ({
              entity: d.Entity.trim(),
              year: +d.Year,
              value: +d[popKey]
            }))
            .filter(d => !isNaN(d.value) && d.value > 0)
            .sort((a, b) => a.year - b.year);
        }
        
        console.log(`Filtered population data for ${selectedRegion}, year ${selectedPopulationYear}:`, 
                   filteredData.slice(0, 5));
        setPopulationData(filteredData);
      })
      .catch(err => console.error('Error updating population data:', err));
  }, [selectedPopulationYear, selectedRegion, activeGlobeDataset]);

  // Compute mobile-aware sidebar widths
  const getSidebarWidth = () => {
    const isMobile = window.innerWidth <= 768;
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isMobile) {
      return isLandscape ? '15vw' : '80vw';
    }
    return '20vw';
  };

  // Add effect to fetch available datasets
  useEffect(() => {
    const fetchDatasets = async () => {
      setIsLoadingDatasets(true);
      try {
        const datasets = await getAvailableDatasets();
        setAvailableDatasets(datasets);
      } catch (error) {
        console.error('Error fetching datasets:', error);
      }
      setIsLoadingDatasets(false);
    };
    
    fetchDatasets();
  }, []);

  // Effect to handle globe data loading
  useEffect(() => {
    if (!activeGlobeDataset) return;

    const loadGlobeData = async () => {
      try {
        console.log("Loading globe data for:", activeGlobeDataset);
        const data = await loadDataset(activeGlobeDataset);
        
        if (activeGlobeDataset === 'life-expectancy') {
          setLifeExpData(data);
        } else if (activeGlobeDataset === 'population') {
          setPopulationData(data);
          if (data && data.length > 0) {
            const years = [...new Set(data.map(d => d.year))];
            setPopulationYears(years);
            setSelectedPopulationYear(Math.max(...years));
          }
        }
      } catch (error) {
        console.error('Error loading globe data:', error);
      }
    };

    loadGlobeData();
  }, [activeGlobeDataset]);

  // Function to handle dataset selection and display
  const handleDatasetSelect = async (datasetId, displayType = 'graph') => {
    console.log("handleDatasetSelect called with:", { datasetId, displayType });
    const dataset = availableDatasets.find(d => d.id === datasetId);
    setSelectedDataset(datasetId);
    
    if (displayType === 'globe') {
      setIsLoadingGlobeData(true);
      setGlobeDataError(null);
      try {
        const data = await loadDataset(datasetId);
        console.log("Loaded data for globe:", data?.slice(0, 5));
        
        if (datasetId === 'population') {
          setPopulationData(data);
          const years = [...new Set(data.map(d => d.year))];
          setPopulationYears(years);
          setSelectedPopulationYear(Math.max(...years));
          setShowGlobe(true);
          setActiveGlobeDataset('population');
        } else if (datasetId === 'life-expectancy') {
          setLifeExpData(data);
          setShowGlobe(true);
          setActiveGlobeDataset('life-expectancy');
        }
        
        setShowGraph(false);
        setActiveDataset(null);
        
      } catch (error) {
        console.error('Error loading globe data:', error);
        setGlobeDataError(error.message);
      } finally {
        setIsLoadingGlobeData(false);
      }
    } else {
      // Store selected region in window for GraphComponent to access
      window.selectedRegion = selectedRegion;
      window.d3 = { csvParse };  // Pass csvParse to window for GraphComponent
      
      setActiveDataset(dataset);
      setShowGraph(true);
      // Don't hide the globe, just show the graph overlay
      // setShowGlobe(false);
      // setActiveGlobeDataset(null);
    }
  };

  // Unified dataset selector component
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
            {availableDatasets.map(dataset => (
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

  // -------------------------------
  // RENDER: Main component UI.
  // -------------------------------
  return (
    <div className="relative flex w-screen h-screen text-gray-100 overflow-hidden font-sciFi bg-black">
      <ParticlesBackground 
        show={showParticles} 
        opacity={particlesOpacity} 
      />

      {/* TOP HUD PANEL */}
      <div
        style={{
          height: `${Math.min(dimensions.top, 30)}vh`,
          minHeight: '40px',
          left: !leftHidden ? `${sidebarWidths.left}vw` : '0',
          right: !rightHidden ? `${sidebarWidths.right}vw` : '0',
          margin: '0 5px'
        }}
        className={`absolute top-0 ${glowEnabled
          ? 'bg-gradient-to-b from-neon-blue/10 to-transparent border-b border-neon-blue/50'
          : 'bg-gray-900/50 border-b border-gray-600'} 
          flex items-center justify-center z-10 backdrop-blur-lg rounded-lg
          transition-all duration-300`}
      >
        <h1 className={`text-2xl sm:text-4xl md:text-6xl font-bold tracking-widest ${
          glowEnabled
            ? 'bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent'
            : 'text-green-700'
          } relative px-2 text-center`}
        >
          PLANETARY HUD
        </h1>
        <div
          className="resize-handle-vertical"
          style={{ bottom: '-6px' }}
          onMouseDown={() => setIsResizing({ ...isResizing, top: true })}
        />
      </div>

      {/* LEFT SIDEBAR */}
      <div 
        className={`fixed top-0 left-0 h-full z-30 
          ${leftHidden ? '-translate-x-full' : 'translate-x-0'}
          backdrop-blur-lg rounded-r-lg`}
        style={{ 
          width: `${sidebarWidths.left}vw`,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          transition: isResizing.left ? 'none' : 'transform 0.3s ease-in-out'
        }}
      >
        <div className="relative h-full overflow-y-auto" style={{ userSelect: isResizing.left ? 'none' : 'auto' }}>
          { !leftHidden && (
            <>
              {/* Header with glow effects */}
              <div 
                className={`flex justify-between items-center cursor-pointer p-2`}
                onClick={() => setLeftHidden(true)}
                style={{
                  background: glowEnabled ? 'linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent)' : 'rgba(0, 0, 0, 0.3)',
                  borderBottom: glowEnabled ? '1px solid rgba(0, 230, 255, 0.3)' : '1px solid rgba(128, 128, 128, 0.3)'
                }}
              >
                <h2 className={`text-2xl font-bold ${
                  glowEnabled 
                    ? 'text-white glow-text' 
                    : 'text-gray-400'
                }`}>
                  SYSTEM STATS
                </h2>
                <span className={`text-xl ${glowEnabled ? 'text-neon-blue glow-text' : 'text-gray-400'}`}>–</span>
              </div>

              {/* Left panel content */}
              <div className="p-6 space-y-6">
                {/* Unified panel for dataset selection */}
                {renderDatasetSelector()}

                {/* Dominant Species Panel */}
                <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 hover:border-neon-blue/50 transition-all">
                  <p className="text-lg">
                    Dominant Species: <br />
                    <span className="text-2xl font-bold text-blue-900">Homo Sapiens</span>
                  </p>
                </div>

                {/* TECHNOLOGY Section */}
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-gray-400">TECHNOLOGY</h4>
                  {/* Kardashev Panel */}
                  <div>
                    <p className={`text-lg mb-2 flex items-center ${glowEnabled ? 'text-neon-purple' : 'text-gray-400'}`}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${glowEnabled ? 'bg-neon-purple' : 'bg-gray-500'}`}></span>
                      Kardashev Type: 0.4
                    </p>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${glowEnabled ? 'bg-gradient-to-r from-neon-purple to-purple-800' : 'bg-gray-500'}`} 
                        style={{ width: '40%' }}
                      />
                    </div>
                  </div>
                  {/* Energy Panel */}
                  <div>
                    <p className={`text-lg mb-2 flex items-center ${glowEnabled ? 'text-neon-red' : 'text-gray-400'}`}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${glowEnabled ? 'bg-neon-red' : 'bg-gray-500'}`}></span>
                      Energy: 49GW/day
                    </p>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${glowEnabled ? 'bg-gradient-to-r from-neon-red to-red-800' : 'bg-gray-500'}`} 
                        style={{ width: '65%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Resize handle for left sidebar */}
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
                style={{
                  transform: 'translateX(50%)',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(prev => ({ ...prev, left: true }));
                }}
              />
            </>
          )}
          { !leftHidden && <ScannerEffect show={showScanner} glowIntensity={glowIntensity} /> }
        </div>
      </div>

      {/* When left sidebar is collapsed, show a button to re-open it */}
      { leftHidden && (
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
      <div className="flex-1 flex items-center justify-center"
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
              // Make sure the globe is visible when graph is closed
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
                key={`globe-${showGlobeTexture}-${updateFPS}-${activeGlobeDataset}`}
                width={800}
                height={800}
                globeMaterial={computedGlobeMaterial}
                backgroundColor="rgba(0,0,0,0)"
                fpsLimit={updateFPS}
                polygonsData={countries.features.filter(feat => feat.properties.ISO_A2 !== 'AQ')}
                polygonAltitude={d => d === hoverD ? 0.15 : 0.1}
                polygonCapColor={(d) => {
                  if (!d?.properties?.ADMIN) return 'rgba(200,200,200,0.01)';
                  
                  const countryName = d.properties.ADMIN.trim().toLowerCase();
                  
                  if (activeGlobeDataset === 'life-expectancy' && lifeExpData?.length) {
                    const countryData = lifeExpData.find(item => 
                      item.entity.toLowerCase() === countryName
                    );
                    if (countryData?.value) {
                      // Green is high life expectancy, red is low (reverse the color scale)
                      const scale = scaleSequentialSqrt(interpolateRdYlGn).domain([45, 85]);
                      const baseColor = scale(countryData.value);
                      console.log(`${countryName}: ${countryData.value} -> ${baseColor}`);
                      return baseColor.replace(/rgb\(/, 'rgba(').replace(/\)/, ',0.7)');
                    }
                  } 
                  
                  if (activeGlobeDataset === 'population' && populationData?.length) {
                    const countryData = populationData.find(item => 
                      item.entity.toLowerCase() === countryName && 
                      item.year === selectedPopulationYear
                    );
                    if (countryData?.value) {
                      const scale = scaleSequentialSqrt(interpolateGreys).domain([1e6, 1.5e9]);
                      const baseColor = scale(countryData.value);
                      return baseColor.replace(/rgb\(/, 'rgba(').replace(/\)/, ',0.7)');
                    }
                  }
                  
                  return 'rgba(200,200,200,0.01)';
                }}
                polygonSideColor={() => 'rgba(150,150,150,0.1)'}
                polygonStrokeColor={(d) => d === hoverD ? 'rgba(57,255,20,1)' : 'rgba(57,255,20,0.3)'}
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

      {/* Update tooltip for country info */}
      {hoverD && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x + 20}px`,
            top: `${tooltipPosition.y - 20}px`,
            transform: 'none',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            zIndex: 9999,  // Ensure it's above everything
            borderLeft: '3px solid rgba(57,255,20,0.8)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
            minWidth: '200px'  // Added to ensure tooltip has consistent width
          }}
        >
          <div className="font-bold text-lg">{hoverD.properties.ADMIN}</div>
          {activeGlobeDataset === 'life-expectancy' && (
            <div className="text-sm text-gray-300">
              Life Expectancy: {
                lifeExpData.find(item => 
                  item.entity.toLowerCase() === hoverD.properties.ADMIN.toLowerCase()
                )?.value?.toFixed(1) || 'N/A'
              } years
            </div>
          )}
          {activeGlobeDataset === 'population' && (
            <div className="text-sm text-gray-300">
              Population: {
                new Intl.NumberFormat().format(
                  populationData?.find(item => 
                    item.entity.toLowerCase() === hoverD.properties.ADMIN.toLowerCase() && 
                    item.year === selectedPopulationYear
                  )?.value || 'N/A'
                )
              }
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">
            Region: {hoverD.properties.REGION_WB || hoverD.properties.CONTINENT || 'N/A'}
          </div>
        </div>
      )}

      {/* Controls for data visualization - only show when not in graph mode */}
      {!showGraph && activeGlobeDataset === 'life-expectancy' && lifeExpYears.length > 0 && (
        <div 
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 
                    bg-gray-900/80 backdrop-blur-md p-3 rounded-lg border border-neon-blue/30"
          style={{ width: '350px' }}
        >
          {/* Region selector dropdown */}
          <div className="mb-2">
            <label className="text-neon-blue text-xs block mb-1">Region/Country:</label>
            <select 
              value={selectedRegion} 
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-1 bg-gray-800 text-neon-blue border border-neon-blue/20 rounded text-xs"
              style={{ maxHeight: '200px' }}
            >
              {availableRegions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
          
          {/* Year slider */}
          <div className="flex justify-between mb-1">
            <span className="text-neon-blue text-xs">Year: {selectedLifeExpYear}</span>
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
      
      {!showGraph && activeGlobeDataset === 'population' && populationYears.length > 0 && (
        <div 
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 
                    bg-gray-900/80 backdrop-blur-md p-3 rounded-lg border border-neon-blue/30"
          style={{ width: '350px' }}
        >
          {/* Region selector dropdown */}
          <div className="mb-2">
            <label className="text-neon-blue text-xs block mb-1">Region/Country:</label>
            <select 
              value={selectedRegion} 
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-1 bg-gray-800 text-neon-blue border border-neon-blue/20 rounded text-xs"
              style={{ maxHeight: '200px' }}
            >
              {availableRegions.map(region => (
                <option key={region} value={region}>{region}</option>
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

      {/* BOTTOM HUD PANEL */}
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
          glowEnabled
            ? 'bg-gray-800/30 border-t border-neon-red/50'
            : 'bg-gray-900/50 border-t border-gray-600'
        } flex items-center justify-center backdrop-blur-lg rounded-lg transition-all duration-300`}
      >
        <div className="text-xs sm:text-sm md:text-xl flex flex-wrap gap-1 sm:gap-2 md:gap-8 p-1 sm:p-2 justify-center">
          <span className="relative z-10 text-orange-900">⚠️ CRITICAL:</span>
          <span className="relative z-10 text-red-900">THERMAL</span>
          <span className="relative z-10 text-red-900">BIOSPHERE</span>
          <span className="relative z-10 text-red-900">RESOURCES</span>
        </div>
        <div className="resize-handle-vertical" 
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
        className={`fixed top-0 right-0 h-full z-30 
          ${rightHidden ? 'translate-x-full' : 'translate-x-0'}
          backdrop-blur-lg rounded-l-lg`}
        style={{ 
          width: `${sidebarWidths.right}vw`,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          transition: isResizing.right ? 'none' : 'transform 0.3s ease-in-out'
        }}
      >
        <div className="relative h-full overflow-y-auto" style={{ userSelect: isResizing.right ? 'none' : 'auto' }}>
          { !rightHidden && (
            <>
              {/* Header with collapse toggle */}
              <div 
                className={`flex justify-between items-center cursor-pointer p-2`}
                onClick={() => setRightHidden(true)}
                style={{
                  background: glowEnabled ? 'linear-gradient(to left, rgba(0, 0, 0, 0.5), transparent)' : 'rgba(0, 0, 0, 0.3)',
                  borderBottom: glowEnabled ? '1px solid rgba(0, 230, 255, 0.3)' : '1px solid rgba(128, 128, 128, 0.3)'
                }}
              >
                <h2 className={`text-2xl font-bold ${
                  glowEnabled 
                    ? 'text-white glow-text' 
                    : 'text-gray-400'
                }`}>
                  MISSION CONTROL
                </h2>
                <span className={`text-xl ${glowEnabled ? 'text-neon-blue glow-text' : 'text-gray-400'}`}>–</span>
              </div>
              {/* Right panel content */}
              <div className="p-6 space-y-6">
                {[
                  { label: 'I. Quantum Gravity Theory', color: 'neon-purple', progress: 40 },
                  { label: 'II. Genomic Decryption', color: 'neon-orange', progress: 65 },
                  { label: 'III. Fusion Ignition', color: 'neon-red', progress: 80 },
                  { label: 'IV. Neural Singularity', color: 'neon-green', progress: 25 },
                ].map((quest, index) => (
                  <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.2 }}
                    className={`group relative p-4 rounded-lg border transition-all ${glowEnabled
                      ? 'border-neon-purple/20 hover:border-neon-purple/50'
                      : 'border-gray-600 hover:border-gray-400'}`}
                  >
                    <p className={`text-lg ${glowEnabled ? 'text-neon-blue' : 'text-blue-900'}`}>
                      <span className={`font-mono ${glowEnabled ? 'glow-text' : 'text-green-900'}`}>
                        {quest.label}
                      </span>
                    </p>
                    <div className="h-1 bg-gray-800 rounded-full">
                      <div className={`h-full transition-all duration-1000 ${glowEnabled ? `bg-gradient-to-r from-${quest.color}` : 'bg-gray-500'}`} style={{ width: `${quest.progress}%` }} />
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`grid grid-cols-2 gap-4 p-4 rounded-xl ${glowEnabled ? 'border border-neon-blue/20' : 'border border-gray-600'}`}
              >
                {['Quantum Physics', 'AI Ethics', 'Exobiology', 'Nanotech', 'Cosmology', 'Cybernetics', 'Terraforming', '???'].map((field, index) => (
                  <div key={field} className={`p-2 text-center ${glowEnabled ? 'text-neon-green' : 'text-gray-400'}`}>
                    [{index.toString(16).toUpperCase()}] {field}
                  </div>
                ))}
              </motion.div>
              {/* Resize handle for right sidebar */}
              <div className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
                style={{
                  transform: 'translateX(-50%)',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(prev => ({ ...prev, right: true }));
                }}
              />
            </>
          )}
          { !rightHidden && <ScannerEffect show={showScanner} glowIntensity={glowIntensity} /> }
        </div>
      </div>
      { rightHidden && (
        <button
          onClick={() => setRightHidden(false)}
          className="fixed right-1 top-1/2 -translate-y-1/2 bg-gray-800/90 p-2 sm:p-3 
            rounded-l-md shadow-lg hover:bg-gray-700 transition-colors z-40
            border border-neon-blue/30"
        >
          &lt;
        </button>
      )}

      <GlowOverlay enabled={glowEnabled} />

      {/* GEAR SETTINGS DROPDOWN */}
      <div className="fixed top-4 right-4 z-[9999]">
        <motion.button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1 rounded-full hover:bg-gray-900/20 backdrop-blur-lg transition-all ${glowEnabled ? '' : 'text-gray-400'}`}
        >
          <svg 
            className="w-6 h-6 sm:w-8 sm:h-8" 
            style={{ stroke: glowEnabled ? '#00f3ff' : '#94a3b8' }}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={1.5}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
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
                {/* Glow Effects Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Glow Effects</span>
                  <label className="switch">
                    <input type="checkbox" checked={glowEnabled} onChange={(e) => setGlowEnabled(e.target.checked)} disabled={lowPowerMode} />
                    <span className="slider round"></span>
                  </label>
                </div>

                {/* Update Rate Selection */}
                <div className="space-y-2">
                  <span className="text-sm text-neon-blue block">Update Rate</span>
                  <div className="flex gap-2">
                    <button onClick={() => setUpdateFPS(1)}
                      className={`flex-1 p-2 rounded-lg transition-colors ${updateFPS === 1 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'}`}
                    >
                      1 FPS
                    </button>
                    <button onClick={() => setUpdateFPS(24)}
                      className={`flex-1 p-2 rounded-lg transition-colors ${updateFPS === 24 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'}`}
                    >
                      24 FPS
                    </button>
                    <button onClick={() => setUpdateFPS(60)}
                      className={`flex-1 p-2 rounded-lg transition-colors ${updateFPS === 60 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'}`}
                    >
                      60 FPS
                    </button>
                  </div>
                </div>

                {/* Scanner Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-neon-blue">Scanner Effect</span>
                  <label className="switch">
                    <input type="checkbox" checked={showScanner} onChange={(e) => setShowScanner(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Particles Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-neon-blue">Particles</span>
                  <label className="switch">
                    <input type="checkbox" checked={showParticles} onChange={(e) => setShowParticles(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Particles Density Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-neon-blue">Particles Density</span>
                    <span className="text-xs text-neon-purple">{Math.round(particlesOpacity * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" value={particlesOpacity}
                    onChange={(e) => setParticlesOpacity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-ne-resize"
                  />
                </div>
                {/* Auto Rotation Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Auto Rotation</span>
                  <label className="switch">
                    <input type="checkbox" checked={rotationEnabled} onChange={(e) => setRotationEnabled(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* CPU Monitor Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">CPU Monitor</span>
                  <label className="switch">
                    <input type="checkbox" checked={enableCpuMonitor} onChange={(e) => setEnableCpuMonitor(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                {enableCpuMonitor && (
                  <div className="text-xs text-neon-purple">
                    System Load: {cpuUsage.toFixed(1)}%
                  </div>
                )}
                {/* Globe Visibility Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Globe Visibility</span>
                  <label className="switch">
                    <input type="checkbox" checked={showGlobe} onChange={(e) => setShowGlobe(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Power Save Mode Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Power Save Mode</span>
                  <label className="switch">
                    <input type="checkbox" checked={lowPowerMode} onChange={(e) => setLowPowerMode(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Add Globe Texture Toggle in settings */}
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
                {/* Globe Opacity Control (keep existing) */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Globe Opacity</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={globeOpacity > 0.5}
                      onChange={(e) => {
                        setGlobeOpacity(e.target.checked ? 1 : 0.5);
                      }}
                      disabled={lowPowerMode}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Material Type Tri-Toggle */}
                <div className="space-y-2">
                  <span className="text-sm text-neon-blue block">Globe Material</span>
                  <div className="flex gap-2">
                    <button onClick={() => setMaterialType('phong')}
                      className={`flex-1 p-2 rounded-lg transition-colors ${materialType === 'phong' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'}`}
                    >
                      Phong
                    </button>
                    <button onClick={() => setMaterialType('lambert')}
                      className={`flex-1 p-2 rounded-lg transition-colors ${materialType === 'lambert' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-gray-800/40 text-gray-300'}`}
                    >
                      Lambert
                    </button>
                    <button onClick={() => setMaterialType('basic')}
                      className={`flex-1 p-2 rounded-lg transition-colors ${materialType === 'basic' ? 'bg-neon-red/20 text-neon-red' : 'bg-gray-800/40 text-gray-300'}`}
                    >
                      Basic
                    </button>
                  </div>
                </div>
                {/* Graticules Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Lat/Lon Grid</span>
                  <label className="switch">
                    <input type="checkbox" checked={showGraticules} onChange={(e) => setShowGraticules(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Atmosphere Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Atmosphere Glow</span>
                  <label className="switch">
                    <input type="checkbox" checked={showAtmosphere} onChange={(e) => setShowAtmosphere(e.target.checked)} disabled={lowPowerMode} />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Globe Appearance Options */}
                <motion.div 
                  className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                >
                  <h4 className="text-xl font-bold mb-4">Globe Appearance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      className={`p-2 rounded-lg ${globeTextureType === 'day' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'}`}
                      onClick={() => setGlobeTextureType('day')}
                    >
                      🌍 Day Mode
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      className={`p-2 rounded-lg ${globeTextureType === 'night' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-gray-800/40 text-gray-300'}`}
                      onClick={() => setGlobeTextureType('night')}
                    >
                      🌙 Night Mode
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </div>
          </Portal>
        )}
      </div>
      
    </div>
  );
}