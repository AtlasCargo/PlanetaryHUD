import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
// Use regular import for three-globe
import ThreeGlobe from 'three-globe';

const GlobeComponent = ({
  width = 800,
  height = 800,
  globeMaterial,
  backgroundColor = "rgba(0,0,0,0)",
  polygonsData = [],
  polygonCapColor,
  polygonSideColor,
  polygonStrokeColor,
  polygonAltitude = 0.01,
  onPolygonHover,
  showGraticules = false,
  showAtmosphere = true,
  atmosphereColor = "lightskyblue",
  atmosphereAltitude = 0.15,
  onGlobeReady,
  fpsLimit = 60,
  showTexture = true  // Add showTexture prop
}) => {
  const containerRef = useRef();
  const globeRef = useRef();
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const controlsRef = useRef();
  const animationFrameId = useRef(null);
  const lastRender = useRef(0);
  const hoveredPolygon = useRef(null);
  const mouse = useRef(new THREE.Vector2());
  const raycaster = useRef(new THREE.Raycaster());
  const isGlobeReady = useRef(false);

  function cartesianToSpherical(x, y, z) {
    const r = Math.sqrt(x * x + y * y + z * z);
    const lat = 90 - (Math.acos(y / r) * 180) / Math.PI;
    const lng = (Math.atan2(x, z) * 180) / Math.PI;
    return { lat, lng };
  }

  function findCountryAtLocation(lat, lng, features) {
    return features.find(country => {
      if (!country.geometry) return false;
      
      function pointInPolygon(point, vs) {
        let x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
          let xi = vs[i][0], yi = vs[i][1];
          let xj = vs[j][0], yj = vs[j][1];
          let intersect = ((yi > y) !== (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      }

      const coords = country.geometry.coordinates;
      if (!coords) return false;

      // Normalize longitude to -180 to 180 range
      const normalizedLng = ((lng + 180) % 360) - 180;

      if (country.geometry.type === 'Polygon') {
        return coords.some(ring => pointInPolygon([normalizedLng, lat], ring));
      } else if (country.geometry.type === 'MultiPolygon') {
        return coords.some(polygon => 
          polygon.some(ring => pointInPolygon([normalizedLng, lat], ring))
        );
      }
      return false;
    });
  }

  // Add a more dramatic opacity shift on hover
  const getHoveredOpacity = (baseColor) => {
    if (!baseColor) return 'rgba(200,200,200,0.8)';
    
    // For RGB/RGBA colors
    if (baseColor.startsWith('rgb')) {
      return baseColor.replace(/[\d.]+\)$/g, '0.95)');
    }
    
    // For hex colors, convert to rgba
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},0.95)`;
  };

  // Add state to track last hover time for transition effects
  const lastHoverTime = useRef(Date.now());
  const nonHoveredOpacity = useRef(0.3); // Default border opacity when no hover

  // Simplify checkHover to focus solely on hover effects
  const checkHover = (event) => {
    if (!globeRef.current || !sceneRef.current || !cameraRef.current) return;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const intersects = raycaster.current.intersectObject(globeRef.current);

    let nextHoverPolygon = null;
    
    if (intersects.length > 0) {
      const intersectPoint = intersects[0].point;
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.extractRotation(globeRef.current.matrix);
      const adjustedPoint = intersectPoint.clone().applyMatrix4(rotationMatrix.invert());
      
      const r = Math.sqrt(adjustedPoint.x * adjustedPoint.x + adjustedPoint.y * adjustedPoint.y + adjustedPoint.z * adjustedPoint.z);
      const lat = 90 - (Math.acos(adjustedPoint.y / r) * 180) / Math.PI;
      const lng = (Math.atan2(adjustedPoint.x, adjustedPoint.z) * 180) / Math.PI;

      nextHoverPolygon = findCountryAtLocation(lat, lng, polygonsData);
    }

    if (nextHoverPolygon !== hoveredPolygon.current) {
      hoveredPolygon.current = nextHoverPolygon;

      if (globeRef.current) {
        // Altitude effect
        globeRef.current.polygonAltitude(d => d === nextHoverPolygon ? 0.035 : 0.01);
        
        // Side color effect - very subtle green
        globeRef.current.polygonSideColor(d => {
          if (d === nextHoverPolygon) {
            return 'rgba(57,255,20,0.15)';  // Much lower opacity
          }
          return 'rgba(150,150,150,0.01)';
        });

        // Cap color effect - extremely subtle green tint
        globeRef.current.polygonCapColor(d => {
          if (d === nextHoverPolygon) {
            // Extremely subtle green tint
            return 'rgba(100,255,100,0.03)';  // Lower opacity and softer green
          }
          
          return polygonCapColor ? polygonCapColor(d) : 'rgba(200,200,200,0.01)';
        });
        
        // Border effect - maintain visibility but soften
        globeRef.current.polygonStrokeColor(d => {
          if (d === nextHoverPolygon) {
            return 'rgba(57,255,20,0.6)';  // Reduced opacity for borders
          }
          return nextHoverPolygon ? 'rgba(57,255,20,0.1)' : 'rgba(57,255,20,0.3)';
        });

        // When no country is hovered anymore, restore borders after delay
        if (!nextHoverPolygon) {
          setTimeout(() => {
            if (!hoveredPolygon.current && globeRef.current) {
              globeRef.current.polygonStrokeColor(() => 'rgba(57,255,20,0.3)');
            }
          }, 3000);
        }
      }

      if (onPolygonHover && event) {
        onPolygonHover(nextHoverPolygon, {
          clientX: event.clientX,
          clientY: event.clientY
        });
      }
    }
  };

  const onMouseMove = (event) => {
    if (!rendererRef.current || !isGlobeReady.current) return;
    
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    checkHover(event);
  };

  // Update globe properties when they change
  useEffect(() => {
    if (globeRef.current) {
      // Set base polygon properties
      globeRef.current.polygonsData(polygonsData);
      
      // For cap color and stroke color, combine parent props with hover state
      globeRef.current.polygonCapColor(d => {
        if (d === hoveredPolygon.current) {
          const baseColor = polygonCapColor ? polygonCapColor(d) : 'rgba(200,200,200,0.01)';
          
          // If it's the default transparent color or a very transparent color (no dataset)
          if (baseColor.match(/rgba\([^,]+,[^,]+,[^,]+,0\.0[0-9]?\)/)) {
            return 'rgba(57,255,20,0.1)'; // Use subtle green tint
          }
          
          // If we have an actual color from the dataset
          return baseColor.replace(/[\d.]+\)$/g, '0.8)'); // Make it more opaque
        }
        return polygonCapColor ? polygonCapColor(d) : 'rgba(200,200,200,0.01)';
      });

      globeRef.current.polygonStrokeColor(d => {
        if (d === hoveredPolygon.current) {
          return 'rgba(57,255,20,1)';
        }
        return 'rgba(57,255,20,0.3)';
      });

      // Other properties
      globeRef.current.showGraticules(showGraticules);
      globeRef.current.showAtmosphere(showAtmosphere);
      globeRef.current.atmosphereColor(atmosphereColor);
      globeRef.current.atmosphereAltitude(atmosphereAltitude);
    }
  }, [polygonsData, polygonCapColor, polygonStrokeColor, hoveredPolygon.current, 
      showGraticules, showAtmosphere, atmosphereColor, atmosphereAltitude]);

  // Update globe material and textures when they change
  useEffect(() => {
    if (globeRef.current && globeMaterial) {
      // Set the texture based on both showTexture and texture type
      if (showTexture) {
        // Apply the texture
        const texturePath = globeMaterial.isNightTexture ? '/textures/earth-night.jpg' : '/textures/earth-day.jpg';
        globeRef.current.globeImageUrl(texturePath);
        globeRef.current.bumpImageUrl('/textures/earth-topology.png');
      } else {
        // Clear the texture
        globeRef.current.globeImageUrl(null);
        globeRef.current.bumpImageUrl(null);
      }

      // Apply other material properties
      Object.assign(globeRef.current.globeMaterial, {
        ...globeMaterial,
        transparent: true,
        opacity: globeMaterial.opacity,
        needsUpdate: true
      });
    }
  }, [globeMaterial, showTexture]);  // Add showTexture to dependencies

  // Main initialization effect
  useEffect(() => {
    // Initialize globe
    const globe = new ThreeGlobe();
    
    // Setup scene first
    const scene = new THREE.Scene();
    scene.background = null;
    scene.add(globe);
    scene.add(new THREE.AmbientLight(0xbbbbbb));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6));

    // Setup renderer with specific alpha handling
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      premultipliedAlpha: false  // Try disabling premultiplied alpha
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    containerRef.current?.appendChild(renderer.domElement);

    // Setup camera
    const camera = new THREE.PerspectiveCamera(60, width/height);
    camera.position.set(0, 0, 250);
    camera.lookAt(scene.position);

    // Setup controls
    const controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 150;
    controls.maxDistance = 500;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.enableDamping = false;

    // Store refs
    globeRef.current = globe;
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    // Set initial polygon stylings with explicit material properties
    globe.polygonAltitude(0.01);
    globe.polygonCapColor(() => 'rgba(200,200,200,0.01)');
    globe.polygonSideColor(() => 'rgba(150,150,150,0.01)');
    globe.polygonStrokeColor(() => 'rgba(57,255,20,0.3)');

    // Configure polygon material properties
    const customMaterial = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    // Apply the material to the globe's polygons
    setTimeout(() => {
      const polygonObj = globe.children?.find(child => child.name === 'custom-polygon');
      if (polygonObj) {
        polygonObj.material = customMaterial;
        polygonObj.material.needsUpdate = true;
      }
    }, 100);

    // Load textures with proper loading tracking
    let texturesLoaded = 0;
    const totalTextures = showTexture ? 2 : 0;
    
    const initializeGlobeWhenReady = () => {
      if (texturesLoaded === totalTextures && globeRef.current) {
        // Configure globe properties
        globe.polygonsData(polygonsData);
        globe.showGraticules(showGraticules);
        globe.showAtmosphere(showAtmosphere);
        globe.atmosphereColor(atmosphereColor);
        globe.atmosphereAltitude(atmosphereAltitude);

        // Enable interactions
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        isGlobeReady.current = true;

        if (onGlobeReady) {
          onGlobeReady();
        }
      }
    };

    if (showTexture) {
      const textureLoader = new THREE.TextureLoader();
      
      // Load globe texture
      textureLoader.load('/textures/earth-night.jpg', 
        (texture) => {
          globe.globeImageUrl('/textures/earth-night.jpg');
          texturesLoaded++;
          initializeGlobeWhenReady();
        },
        undefined,
        (error) => console.error('Error loading globe texture:', error)
      );

      // Load bump map
      textureLoader.load('/textures/earth-topology.png',
        (texture) => {
          globe.bumpImageUrl('/textures/earth-topology.png');
          texturesLoaded++;
          initializeGlobeWhenReady();
        },
        undefined,
        (error) => console.error('Error loading bump texture:', error)
      );
    } else {
      // If no textures needed, initialize immediately
      initializeGlobeWhenReady();
    }

    const getRotationSpeed = () => {
      if (fpsLimit === 1) return 0.015;
      if (fpsLimit === 24) return 0.001;
      return 0.002;
    };

    const ROTATION_SPEED = getRotationSpeed();

    // Animation setup for different FPS modes
    let hoverCheckInterval;
    
    if (fpsLimit <= 1) {
      animationFrameId.current = setInterval(() => {
        controls.update();
        const latestEvent = {
          clientX: mouse.current.x * width/2 + width/2,
          clientY: -mouse.current.y * height/2 + height/2
        };
        checkHover(latestEvent);
        if (globe.rotation) {
          globe.rotation.y += ROTATION_SPEED;
        }
        renderer.render(scene, camera);
      }, 1000);
      
      // Separate interval for more frequent hover checks in low FPS mode
      hoverCheckInterval = setInterval(() => {
        checkHover({
          clientX: mouse.current.x * width/2 + width/2,
          clientY: -mouse.current.y * height/2 + height/2
        });
      }, 100);
    } else {
      // Animation setup for higher FPS modes
      const animate = (now) => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastRender.current;
        const frameInterval = 1000 / fpsLimit;

        if (deltaTime >= frameInterval) {
          controls.update();
          const latestEvent = {
            clientX: mouse.current.x * width/2 + width/2,
            clientY: -mouse.current.y * height/2 + height/2
          };
          checkHover(latestEvent);
          
          if (globe.rotation) {
            globe.rotation.y += ROTATION_SPEED;
          }
          
          renderer.render(scene, camera);
          lastRender.current = currentTime;
        }
        
        animationFrameId.current = requestAnimationFrame(animate);
      };
      
      animate(performance.now());
    }

    // Initial material setup if provided
    if (globeMaterial) {
      Object.assign(globe.globeMaterial, {
        ...globeMaterial,
        needsUpdate: true
      });
    }

    // Cleanup
    return () => {
      if (fpsLimit <= 1) {
        clearInterval(animationFrameId.current);
        if (hoverCheckInterval) {
          clearInterval(hoverCheckInterval);
        }
      } else {
        cancelAnimationFrame(animationFrameId.current);
      }
      renderer.dispose();
      controls.dispose();
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} />;
};

export default GlobeComponent;