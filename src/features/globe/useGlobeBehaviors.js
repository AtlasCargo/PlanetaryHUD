import { useEffect, useRef, useCallback } from 'react';

export default function useGlobeBehaviors({ rotationEnabled, globeRef, isUserInteracting, setIsGlobeReady, setUpdateFPS }) {
  const autoRotateId = useRef(null);

  const startAutoRotate = useCallback(() => {
    if (autoRotateId.current != null) return;
    let lastTime = performance.now();
    const BASE_SPEED = 0.0008;
    const animate = (time) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      if (rotationEnabled && globeRef.current) {
        const currentPOV = globeRef.current.pointOfView();
        globeRef.current.pointOfView({ ...currentPOV, lng: currentPOV.lng - BASE_SPEED * deltaTime });
      }
      autoRotateId.current = requestAnimationFrame(animate);
    };
    autoRotateId.current = requestAnimationFrame(animate);
  }, [rotationEnabled, globeRef]);

  const stopAutoRotate = useCallback(() => {
    if (autoRotateId.current !== null) {
      cancelAnimationFrame(autoRotateId.current);
      autoRotateId.current = null;
    }
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    if (rotationEnabled) startAutoRotate();
    else if (!isUserInteracting.current && autoRotateId.current !== null) stopAutoRotate();
  }, [rotationEnabled, startAutoRotate, stopAutoRotate]);

  const onGlobeReady = useCallback(() => {
    setIsGlobeReady && setIsGlobeReady(true);
    setTimeout(() => {
      if (globeRef.current) {
        const pov = globeRef.current.pointOfView();
        globeRef.current.pointOfView({ ...pov }, 10);
      }
    }, 100);
    if (typeof setUpdateFPS === 'function') {
      // Ensure FPS is at least 24 on ready
      setUpdateFPS((prev) => (prev && prev >= 12 ? prev : 24));
    }
    if (globeRef.current && typeof globeRef.current.debug === 'function') {
      try { globeRef.current.debug(true); } catch {}
    }
  }, [globeRef, setIsGlobeReady, setUpdateFPS]);

  return { onGlobeReady };
}


