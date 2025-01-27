// src/components/ReactGlobeExample.jsx

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { motion } from 'framer-motion';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';
import Portal from './Portal';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
//import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
//import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
//import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
//import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
//import * as THREE from 'three';

export default function ReactGlobeExample() {
  const globeRef = useRef(null);
  const [countries, setCountries] = useState({ features: [] });
  const [hoverD, setHoverD] = useState(null);
  const [topDivHeight, setTopDivHeight] = useState(96); // 24 * 4 = 96px initial height
  const [bottomDivHeight, setBottomDivHeight] = useState(96);
  const [isResizingTop, setIsResizingTop] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(25); // 25% initial width
  const [rightSidebarWidth, setRightSidebarWidth] = useState(25);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(1); // 0-1 range
  const [particlesOpacity, setParticlesOpacity] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [rotationSpeed] = useState(0.3);
  const [controls, setControls] = useState(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [cpuUsage, setCpuUsage] = useState(0);
  const [enableCpuMonitor, setEnableCpuMonitor] = useState(false);
  const [webGPUSupported, setWebGPUSupported] = useState(false);
  // Comment out AA state
  // const [enableAA, setEnableAA] = useState(false);

  useEffect(() => {
    // Fetch country GeoJSON data
    fetch(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
    )
      .then((res) => res.json())
      .then(setCountries)
      .catch((err) => console.error(err));
  }, []);

  const maxVal = useMemo(() => {
    const getVal =
      (f) =>
      f.properties?.GDP_MD_EST /
        Math.max(1e5, f.properties?.POP_EST || 1) ||
      0;
    return Math.max(...countries.features.map(getVal));
  }, [countries]);

  // Define initial camera position
  const initialCameraPosition = {
    lat: 0,
    lng: 0,
    altitude: 2.5, // Adjust altitude for zoom (smaller is closer)
  };

  // Initialize tsparticles
  const particlesInit = async (main) => {
    await loadFull(main);
  };

  // Add resize handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingLeft) {
        const percentage = (e.clientX / window.innerWidth) * 100;
        setLeftSidebarWidth(Math.min(Math.max(15, percentage), 40)); // Limit between 15% and 40%
      }
      if (isResizingRight) {
        const percentage = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
        setRightSidebarWidth(Math.min(Math.max(15, percentage), 40));
      }
      if (isResizingTop) {
        const newHeight = Math.max(48, e.clientY);
        setTopDivHeight(newHeight);
      }
      if (isResizingBottom) {
        const windowHeight = window.innerHeight;
        const newHeight = Math.max(48, windowHeight - e.clientY);
        setBottomDivHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
      setIsResizingTop(false);
      setIsResizingBottom(false);
    };

    if (isResizingLeft || isResizingRight || isResizingTop || isResizingBottom) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, isResizingTop, isResizingBottom]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!controls || !rotationEnabled || !isPageVisible) return;

    let animationFrameId;
    let lastTime = performance.now();

    const animate = (time) => {
      if (!isPageVisible) return;

      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Use absolute time
      lastTime = currentTime;

      controls.autoRotate = true;
      controls.autoRotateSpeed = rotationSpeed;
      controls.update(deltaTime);
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (controls) controls.autoRotate = false;
    };
  }, [controls, rotationEnabled, rotationSpeed, isPageVisible]);

  const animate = (time) => {
    if (globeRef.current && globeRef.current.controls) {
      console.log('Animating frame, controls:', globeRef.current.controls);
      console.log('AutoRotate:', globeRef.current.controls.autoRotate);
      console.log('Rotation speed:', globeRef.current.controls.autoRotateSpeed);
      
      const deltaTime = (time - (animationFrameId.current?.time || 0)) / 1000;
      console.log('Delta time:', deltaTime);
      
      globeRef.current.controls.update(deltaTime);
      animationFrameId.current = { id: requestAnimationFrame(animate), time };
    }
  };

  useEffect(() => {
    if (!enableCpuMonitor) return;

    let lastTime = performance.now();
    let frameCount = 0;
    let rafId;

    const checkLoad = () => {
      const now = performance.now();
      frameCount++;

      if (now >= lastTime + 1000) {
        const targetFPS = 60;
        const actualFPS = frameCount / ((now - lastTime) / 1000);
        // Invert the percentage (lower FPS = higher load)
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
      setCpuUsage(0); // Reset when disabled
    };
  }, [enableCpuMonitor]); // Only run when enableCpuMonitor changes

  // Comment out AA useEffect
  // useEffect(() => {
  //   if (!globeRef.current || !enableAA) return;
  //
  //   const renderer = globeRef.current.renderer();
  //   renderer.domElement.style.imageRendering = 'auto'; // Reset if previously set
  // }, [enableAA]);

  return (
    <div 
      className="relative flex w-screen h-screen text-gray-100 overflow-hidden font-sciFi"
      style={{
        backgroundImage: `url('https://t4.ftcdn.net/jpg/02/43/75/73/360_F_243757367_gBpS6R5c8DB7pL5gw9gi9KXlzFfbdZOA.jpg')`,
        backgroundSize: '622px', // Exact size of the pattern
        backgroundPosition: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        backgroundBlendMode: 'hard-light'
      }}
    >
      {/* Starfield Background */}
      {showParticles && (
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            background: {
              color: {
                value: '#000000',
              },
            },
            fpsLimit: 60,
            interactivity: {
              detectsOn: 'canvas',
              events: {
                resize: true,
              },
            },
            particles: {
              color: {
                value: '#ffffff',
              },
              number: {
                value: 200,
                density: {
                  enable: true,
                  area: 800,
                },
              },
              opacity: {
                value: 0.5,
                random: true,
                anim: {
                  enable: false,
                },
              },
              size: {
                value: 1,
                random: true,
              },
              move: {
                enable: true,
                speed: 0.1,
                direction: 'none',
                random: false,
                straight: false,
                outModes: {
                  default: 'out',
                },
              },
            },
          }}
          className="absolute inset-0 z-0"
          style={{ opacity: particlesOpacity }}
        />
      )}

      {/* Left Sidebar */}
      <div 
        style={{ width: `${leftSidebarWidth}%` }}
        className="relative bg-gradient-to-r from-gray-800/50 to-gray-900/20 p-6 overflow-auto rounded-r-2xl backdrop-blur-2xl z-10 shadow-2xl border-r border-neon-blue/20"
      >
        {showScanner && (
          <div 
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: `linear-gradient(0deg, transparent 50%, rgba(0, 230, 255, ${0.05 * glowIntensity}) 50%)`,
              backgroundSize: '100% 4px',
              animation: 'scan 20s linear infinite',
            }}
          />
        )}
        <motion.h3
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="text-3xl font-bold mb-8 relative font-sciFi"
          style={{
            filter: glowEnabled ? `brightness(${1 + (glowIntensity * 0.5)})` : 'none'
          }}
        >
          <span className={`bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text ${
            glowEnabled ? 'text-transparent' : 'text-gray-100'
          }`}>
            SYSTEM STATS
          </span>
          {glowEnabled && (
            <span 
              className="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple blur-xl opacity-50"
              style={{ opacity: 0.3 * glowIntensity }}
            />
          )}
        </motion.h3>
        <div className="space-y-6">
          {/* Dominant Species - Moved to top */}
          <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 hover:border-neon-blue/50 transition-all">
            <p className="text-lg">
              Dominant Species: <br />
              <span className="text-2xl font-bold text-neon-blue">Homo Sapiens</span>
            </p>
          </div>

          {/* Population */}
          <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 hover:border-neon-blue/50 transition-all">
            <p className="text-lg">
              Population: <br />
              <span className="text-2xl font-bold text-neon-blue">7.8B</span>
            </p>
          </div>

          {/* Civilization Age */}
          <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 hover:border-neon-blue/50 transition-all">
            <p className="text-lg">
              Civilization Age: <br />
              <span className="text-2xl font-bold text-neon-blue">&gt;12k years</span>
            </p>
          </div>

          {/* Biodiversity */}
          <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 hover:border-neon-blue/50 transition-all">
            <p className="text-lg">
              Biodiversity: <br />
              <span className="text-2xl font-bold text-neon-blue">&gt;100M species</span>
            </p>
          </div>

          {/* Technology - Keep pulsating dots here */}
          <div className="space-y-4">
            <h4 className="text-xl font-bold text-neon-blue">TECHNOLOGY</h4>
            <div>
              <p className="text-lg mb-2 flex items-center">
                <span className="inline-block w-2 h-2 bg-neon-purple rounded-full mr-2 animate-pulse"></span>
                Kardashev Type: 0.4
              </p>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="w-[40%] h-full bg-neon-purple rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <p className="text-lg mb-2 flex items-center">
                <span className="inline-block w-2 h-2 bg-neon-red rounded-full mr-2 animate-pulse"></span>
                Energy: 49GW/day
              </p>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="w-[65%] h-full bg-neon-red rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        {/* Resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-neon-blue/20"
          onMouseDown={() => setIsResizingLeft(true)}
        />
      </div>

      {/* Center Container for Globe */}
      <div className="flex-1 flex items-center justify-center">
        {/* Top Div */}
        <div 
          style={{ height: topDivHeight, left: `${leftSidebarWidth}%`, right: `${rightSidebarWidth}%` }}
          className="absolute top-0 bg-gradient-to-b from-neon-blue/20 to-transparent border-b border-neon-blue/50 flex items-center justify-center z-10 backdrop-blur-lg"
        >
          <h1 className="text-6xl font-bold tracking-widest glow-static">
            PLANETARY HUD
          </h1>
          {/* Add resize handle */}
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-neon-blue/20"
            onMouseDown={() => setIsResizingTop(true)}
          />
        </div>

        <div 
          style={{ 
            width: '800px',
            aspectRatio: '1/1',
            margin: '0 auto'
          }} 
          className="flex items-center justify-center"
        >
          <Globe
            ref={globeRef}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            backgroundColor="rgba(0,0,0,0)"
            width={800}
            height={800}
            polygonsData={countries.features.filter(
              (d) => d.properties?.ISO_A2 !== 'AQ'
            )}
            polygonAltitude={(d) => (d === hoverD ? 0.0125 : 0)}
            polygonCapColor={(d) =>
              d === hoverD ? 'rgba(70, 130, 180, 0.07)' : 'rgba(70, 130, 180, 0)'
            }
            polygonSideColor={() => 'rgba(0, 100, 0, 0.15)'}
            polygonStrokeColor={() => 'rgba(170, 255, 0, 0.55)'}
            polygonLabel={({ properties: d }) => `<b>${d.ADMIN}</b>`}
            onPolygonHover={setHoverD}
            polygonsTransitionDuration={300}
            atmosphereColor="#1A535C"
            atmosphereAltitude={0.25}
            cameraPosition={initialCameraPosition}
            autoRotate={autoRotate}
            autoRotateSpeed={0.3}
            onGlobeReady={() => {
              if (globeRef.current) {
                const newControls = new OrbitControls(
                  globeRef.current.camera(),
                  globeRef.current.renderer().domElement
                );
                newControls.autoRotate = rotationEnabled;
                newControls.autoRotateSpeed = rotationSpeed;
                newControls.enableDamping = true;
                newControls.dampingFactor = 0.05;
                setControls(newControls);
                const renderer = globeRef.current.renderer();
                renderer.setPixelRatio(window.devicePixelRatio);
                //console.log('AA Status:', renderer.getContext().getContextAttributes().antialias);
              }
            }}
            rendererConfig={{
              // antialias: enableAA,
              powerPreference: "high-performance"
            }}
          />
        </div>
      </div>

      {/* Bottom Div */}
      <div 
        style={{ height: bottomDivHeight, left: `${leftSidebarWidth}%`, right: `${rightSidebarWidth}%` }}
        className="absolute bottom-0 bg-gray-800/30 border-t border-neon-red/50 flex items-center justify-center z-10 backdrop-blur-lg"
      >
        <div className="text-xl text-neon-red glow-red flex gap-8">
          <span className="relative z-10">⚠️ CRITICAL SYSTEMS:</span>
          <span className="relative z-10">I. THERMAL RUNAWAY</span>
          <span className="relative z-10">II. BIOSPHERE COLLAPSE</span>
          <span className="relative z-10">III. RESOURCE DEPLETION</span>
        </div>
        {/* Add resize handle */}
        <div
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-neon-red/20"
          onMouseDown={() => setIsResizingBottom(true)}
        />
      </div>

      {/* Right Sidebar - Mission Control */}
      <div 
        style={{ width: `${rightSidebarWidth}%` }}
        className="relative bg-gradient-to-l from-gray-800/50 to-gray-900/20 p-6 overflow-auto rounded-l-2xl backdrop-blur-2xl z-20 shadow-2xl border-l border-neon-blue/20"
      >
        {showScanner && (
          <div 
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: `linear-gradient(0deg, transparent 50%, rgba(0, 230, 255, ${0.05 * glowIntensity}) 50%)`,
              backgroundSize: '100% 4px',
              animation: 'scan 20s linear infinite',
            }}
          />
        )}
        {/* Mission Control Header */}
        <motion.h3
          className="text-3xl font-bold mb-8 relative font-sciFi"
          style={{
            filter: glowEnabled ? `brightness(${1 + (glowIntensity * 0.5)})` : 'none'
          }}
        >
          <span className={`bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text ${
            glowEnabled ? 'text-transparent' : 'text-gray-100'
          }`}>
            MISSION CONTROL
          </span>
          {glowEnabled && (
            <span 
              className="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple blur-2xl opacity-80"
              style={{ opacity: 0.6 * glowIntensity }}
            />
          )}
        </motion.h3>

        {/* Quests with Progress */}
        <div className="space-y-6 mb-12">
          {[
            { label: "I. Quantum Gravity Theory", color: "neon-purple", progress: 40 },
            { label: "II. Genomic Decryption", color: "neon-orange", progress: 65 },
            { label: "III. Fusion Ignition", color: "neon-red", progress: 80 },
            { label: "IV. Neural Singularity", color: "neon-green", progress: 25 },
          ].map((quest, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="group relative p-4 bg-gray-900/40 rounded-lg border border-neon-purple/20 hover:border-neon-purple/50 transition-all glow-hover"
            >
              <p className="text-lg mb-2">
                <span className="font-mono text-neon-blue glow-text">
                  {quest.label}
                </span>
              </p>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-${quest.color} to-${quest.color}-dark transition-all duration-1000`}
                  style={{ width: `${quest.progress}%` }}
                />
              </div>
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none" 
                style={{ boxShadow: `0 0 15px -5px var(--${quest.color})`, opacity: 0.3 }}/>
            </motion.div>
          ))}
        </div>

        {/* Knowledge Matrix */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-4 p-4 bg-gray-900/50 rounded-xl border border-neon-blue/20"
        >
          {['Quantum Physics', 'AI Ethics', 'Exobiology', 'Nanotech', 'Cosmology', 'Cybernetics', 'Terraforming', '???'].map((field, index) => (
            <div key={field} className="p-2 text-center font-mono border border-neon-blue/10 hover:border-neon-blue/30 transition-colors">
              <span className="text-neon-green">[{index.toString(16).toUpperCase()}]</span>{' '}
              <span className="text-neon-purple">{field}</span>
            </div>
          ))}
        </motion.div>

        {/* Add resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-neon-blue/20"
          onMouseDown={() => setIsResizingRight(true)}
        />
      </div>

      {/* Global Glow Effects */}
      <div className="absolute inset-0 pointer-events-none" 
        style={{
          boxShadow: 'inset 0 0 200px rgba(0, 230, 255, 0.1)',
          background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(0,0,0,0.9))'
        }}
      />

      {/* Settings Gear Container */}
      <div className="fixed top-4 right-4 z-[9999]">
        <motion.button
          onClick={() => setShowSettings(!showSettings)}
          whileHover={{ 
            rotate: 360,
            transition: { 
              repeat: Infinity, 
              duration: 12,
              ease: "linear",
              repeatType: "loop" 
            } 
          }}
          className="p-1 rounded-full hover:bg-gray-900/20 backdrop-blur-lg transition-all"
        >
          <svg
            className="w-8 h-8 text-neon-blue"
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

        {/* Dropdown positioned relative to gear */}
        {showSettings && (
          <Portal>
            <div className="fixed top-[3.5rem] right-4 w-64 bg-gray-900/95 border border-neon-blue/50 rounded-lg shadow-2xl backdrop-blur-xl p-4 z-[99999]">
              <div className="space-y-4">
                {/* Glow Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Glow Effects</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={glowEnabled}
                      onChange={(e) => setGlowEnabled(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                {/* Glow Intensity Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-neon-blue">Glow Strength</span>
                    <span className="text-xs text-neon-purple">{Math.round(glowIntensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={glowIntensity}
                    onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-ne-resize"
                  />
                </div>

                {/* Scanner Toggle */}
                <div className="flex items-center justify-between pt-2">
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

                {/* Particles Toggle */}
                <div className="flex items-center justify-between pt-2">
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

                {/* Particles Slider */}
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
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-ne-resize"
                  />
                </div>

                {/* Auto Rotation Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Auto Rotation</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={rotationEnabled}
                      onChange={(e) => {
                        console.log('Rotation toggle:', e.target.checked);
                        setRotationEnabled(e.target.checked);
                      }}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Inside settings dropdown */}
                {/* <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Anti-Aliasing</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={enableAA}
                      onChange={(e) => {
                        console.log('AA Toggled:', e.target.checked);
                        setEnableAA(e.target.checked);
                      }}
                    />
                    <span className="slider round"></span>
                  </label>
                </div> */}
                
                {/* CPU Monitor Toggle */}
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

                {/* CPU Monitor Display */}
                {enableCpuMonitor && (
                  <div className="text-xs text-neon-purple">
                    System Load: {cpuUsage.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </Portal>
        )}
      </div>
    </div>
  );
}
