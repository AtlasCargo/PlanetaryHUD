import { useEffect } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function useOrbitControls({ isGlobeReady, globeRef, isUserInteracting, rotationEnabled }) {
  useEffect(() => {
    if (!isGlobeReady || !globeRef?.current) return;
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

    const onStart = () => { if (isUserInteracting) isUserInteracting.current = true; };
    const onEnd = () => { if (isUserInteracting) isUserInteracting.current = false; };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      controls.dispose();
    };
  }, [isGlobeReady, globeRef, isUserInteracting, rotationEnabled]);
}



