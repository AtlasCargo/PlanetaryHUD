import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import ThreeGlobe from 'three-globe';

export default function GlobeComponent({
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
  showTexture = true
}) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastRender = useRef(0);
  const hoveredPolygon = useRef(null);
  const mouse = useRef(new THREE.Vector2());
  const raycaster = useRef(new THREE.Raycaster());
  const isGlobeReady = useRef(false);

  const onMouseMove = (event) => {
    if (!rendererRef.current || !isGlobeReady.current) return;
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    checkHover(event);
  };

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

      const r = adjustedPoint.length();
      const lat = 90 - (Math.acos(adjustedPoint.y / r) * 180) / Math.PI;
      const lng = (Math.atan2(adjustedPoint.x, adjustedPoint.z) * 180) / Math.PI;

      nextHoverPolygon = findCountryAtLocation(lat, lng, polygonsData);
    }

    if (nextHoverPolygon !== hoveredPolygon.current) {
      hoveredPolygon.current = nextHoverPolygon;
      if (globeRef.current) {
        globeRef.current.polygonAltitude(d => (d === nextHoverPolygon ? 0.035 : 0.01));
        globeRef.current.polygonSideColor(d => (
          d === nextHoverPolygon ? 'rgba(57,255,20,0.15)' : 'rgba(150,150,150,0.01)'
        ));
        globeRef.current.polygonCapColor(d => (
          d === nextHoverPolygon
            ? 'rgba(100,255,100,0.03)'
            : polygonCapColor ? polygonCapColor(d) : 'rgba(200,200,200,0.01)'
        ));
        globeRef.current.polygonStrokeColor(d => (
          d === nextHoverPolygon ? 'rgba(57,255,20,0.6)' : 'rgba(57,255,20,0.3)'
        ));

        // Restore less transparent borders if none is hovered
        if (!nextHoverPolygon) {
          setTimeout(() => {
            if (!hoveredPolygon.current && globeRef.current) {
              globeRef.current.polygonStrokeColor(() => 'rgba(57,255,20,0.3)');
            }
          }, 3000);
        }
      }
      if (onPolygonHover && event) {
        onPolygonHover(nextHoverPolygon, { clientX: event.clientX, clientY: event.clientY });
      }
    }
  };

  function findCountryAtLocation(lat, lng, features) {
    return features.find(country => {
      if (!country.geometry) return false;
      const coords = country.geometry.coordinates;
      if (!coords) return false;
      const normalizedLng = ((lng + 180) % 360) - 180;

      const pointInPolygon = (point, vs) => {
        let x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
          let xi = vs[i][0], yi = vs[i][1];
          let xj = vs[j][0], yj = vs[j][1];
          let intersect =
            (yi > y) !== (yj > y) &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        return inside;
      };

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

  // Re-apply polygon styles if props update
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.polygonsData(polygonsData);
    globeRef.current.polygonCapColor(d =>
      d === hoveredPolygon.current
        ? 'rgba(57,255,20,0.1)'
        : polygonCapColor
          ? polygonCapColor(d)
          : 'rgba(200,200,200,0.01)'
    );
    globeRef.current.showGraticules(showGraticules);
    globeRef.current.showAtmosphere(showAtmosphere);
    globeRef.current.atmosphereColor(atmosphereColor);
    globeRef.current.atmosphereAltitude(atmosphereAltitude);
  }, [
    polygonsData,
    polygonCapColor,
    polygonStrokeColor,
    showGraticules,
    showAtmosphere,
    atmosphereColor,
    atmosphereAltitude
  ]);

  // Update globe textures/material
  useEffect(() => {
    if (!globeRef.current) return;
    if (showTexture) {
      const texturePath = globeMaterial?.isNightTexture
        ? '/textures/earth-night.jpg'
        : '/textures/earth-day.jpg';
      globeRef.current.globeImageUrl(texturePath);
      globeRef.current.bumpImageUrl('/textures/earth-topology.png');
    } else {
      globeRef.current.globeImageUrl(null);
      globeRef.current.bumpImageUrl(null);
    }
    if (globeMaterial) {
      Object.assign(globeRef.current.globeMaterial, {
        ...globeMaterial,
        transparent: true,
        needsUpdate: true
      });
    }
  }, [globeMaterial, showTexture]);

  // Main init
  useEffect(() => {
    const globe = new ThreeGlobe();
    const scene = new THREE.Scene();
    scene.add(globe);
    scene.add(new THREE.AmbientLight(0xbbbbbb));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6));

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(60, width / height);
    camera.position.set(0, 0, 250);
    camera.lookAt(scene.position);

    const controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 150;
    controls.maxDistance = 500;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;

    globeRef.current = globe;
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    globe.polygonAltitude(polygonAltitude);
    globe.polygonCapColor(() => 'rgba(200,200,200,0.01)');
    globe.polygonSideColor(() => 'rgba(150,150,150,0.01)');
    globe.polygonStrokeColor(() => 'rgba(57,255,20,0.3)');

    const customMaterial = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    setTimeout(() => {
      const polygonObj = globe.children?.find(child => child.name === 'custom-polygon');
      if (polygonObj) {
        polygonObj.material = customMaterial;
        polygonObj.material.needsUpdate = true;
      }
    }, 100);

    let texturesLoaded = 0;
    const totalTextures = showTexture ? 2 : 0;

    const initializeGlobe = () => {
      if (texturesLoaded === totalTextures) {
        globe.polygonsData(polygonsData);
        globe.showGraticules(showGraticules);
        globe.showAtmosphere(showAtmosphere);
        globe.atmosphereColor(atmosphereColor);
        globe.atmosphereAltitude(atmosphereAltitude);

        renderer.domElement.addEventListener('mousemove', onMouseMove);
        isGlobeReady.current = true;
        if (onGlobeReady) onGlobeReady();

        // Set initial hover on a country after globe is ready
        setTimeout(() => {
          if (polygonsData && polygonsData.length > 0) {
            // Find a notable country for initial hover (e.g., United States)
            const initialCountry = polygonsData.find(
              country => country.properties?.ADMIN?.toLowerCase() === 'united states'
            ) || polygonsData[Math.floor(Math.random() * polygonsData.length)];

            if (initialCountry) {
              hoveredPolygon.current = initialCountry;
              globe.polygonAltitude(d => (d === initialCountry ? 0.035 : 0.01));
              globe.polygonSideColor(d => (
                d === initialCountry ? 'rgba(57,255,20,0.15)' : 'rgba(150,150,150,0.01)'
              ));
              globe.polygonCapColor(d => (
                d === initialCountry
                  ? 'rgba(100,255,100,0.03)'
                  : polygonCapColor ? polygonCapColor(d) : 'rgba(200,200,200,0.01)'
              ));
              globe.polygonStrokeColor(d => (
                d === initialCountry ? 'rgba(57,255,20,0.6)' : 'rgba(57,255,20,0.3)'
              ));

              // Trigger the hover callback to update tooltip in parent component
              if (onPolygonHover) {
                // Calculate center of screen for initial tooltip position
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                onPolygonHover(initialCountry, { clientX: centerX, clientY: centerY });
              }
            }
          }
        }, 300); // Small delay to ensure globe is fully initialized
      }
    };

    if (showTexture) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        '/textures/earth-night.jpg',
        () => {
          globe.globeImageUrl('/textures/earth-night.jpg');
          texturesLoaded++;
          initializeGlobe();
        },
        undefined,
        () => {}
      );
      textureLoader.load(
        '/textures/earth-topology.png',
        () => {
          globe.bumpImageUrl('/textures/earth-topology.png');
          texturesLoaded++;
          initializeGlobe();
        },
        undefined,
        () => {}
      );
    } else {
      initializeGlobe();
    }

    const getRotationSpeed = () => {
      if (fpsLimit === 1) return 0.015;
      if (fpsLimit === 24) return 0.001;
      return 0.002;
    };
    const ROTATION_SPEED = getRotationSpeed();

    let hoverCheckInterval;
    if (fpsLimit <= 1) {
      animationFrameId.current = setInterval(() => {
        controls.update();
        checkHover({ clientX: mouse.current.x, clientY: mouse.current.y });
        if (globe.rotation) globe.rotation.y += ROTATION_SPEED;
        renderer.render(scene, camera);
      }, 1000);

      hoverCheckInterval = setInterval(() => {
        checkHover({ clientX: mouse.current.x, clientY: mouse.current.y });
      }, 100);
    } else {
      const animate = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastRender.current;
        const frameInterval = 1000 / fpsLimit;
        if (deltaTime >= frameInterval) {
          controls.update();
          checkHover({ clientX: mouse.current.x, clientY: mouse.current.y });
          if (globe.rotation) globe.rotation.y += ROTATION_SPEED;
          renderer.render(scene, camera);
          lastRender.current = currentTime;
        }
        animationFrameId.current = requestAnimationFrame(animate);
      };
      animate();
    }

    if (globeMaterial) {
      Object.assign(globe.globeMaterial, { ...globeMaterial, needsUpdate: true });
    }

    return () => {
      if (fpsLimit <= 1) {
        clearInterval(animationFrameId.current);
        if (hoverCheckInterval) clearInterval(hoverCheckInterval);
      } else {
        cancelAnimationFrame(animationFrameId.current);
      }
      renderer.dispose();
      controls.dispose();
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ background: backgroundColor }} />;
}
