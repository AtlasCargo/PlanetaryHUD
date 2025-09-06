import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// AvatarHead renders a small Three.js view of a GLB/GLTF head and applies morph targets
// based on the provided faceDriver values. It is resilient if the model is missing.

const DEFAULT_MAPPING = {
  mouthOpenness: ['jawOpen', 'MouthOpen', 'mouthOpen'],
  jawPosition: [], // often coupled with jawOpen; optional
  lipPucker: ['mouthPucker', 'MouthPucker', 'pucker'],
  // Smile/frown splits across left/right if available
  smilePos: ['mouthSmile_L', 'mouthSmile_R', 'SmileLeft', 'SmileRight'],
  frownPos: ['mouthFrown_L', 'mouthFrown_R', 'FrownLeft', 'FrownRight'],
  eyeOpennessInv: ['eyeBlink_L', 'eyeBlink_R', 'EyeBlinkLeft', 'EyeBlinkRight'],
  eyebrowHeight: ['browInnerUp', 'BrowInnerUp'],
};

function applyMorph(mesh, name, value) {
  if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return false;
  const idx = mesh.morphTargetDictionary[name];
  if (idx == null) return false;
  mesh.morphTargetInfluences[idx] = THREE.MathUtils.clamp(value, 0, 1);
  return true;
}

function setFirstAvailable(mesh, names, value) {
  for (const n of names) {
    if (applyMorph(mesh, n, value)) return true;
  }
  return false;
}

export default function AvatarHead({ faceDriver, modelUrl = '/models/head.glb', mapping = DEFAULT_MAPPING, width = 220, height = 220, liveBlend = 1.0, onLoad }) {
  const containerRef = useRef(null);
  const threeRef = useRef({});
  const fdRef = useRef({ faceDriver, liveBlend });

  // Keep a ref to latest driver values to avoid re-creating the scene per update
  useEffect(() => {
    fdRef.current = { faceDriver, liveBlend };
  }, [faceDriver, liveBlend]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 0, 0.9);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(0.5, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040, 0.6));

    let head = null;
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        head = gltf.scene;
        // Center and scale casually
        head.traverse((obj) => {
          if (obj.isMesh) {
            obj.material = obj.material.clone();
            obj.material.transparent = false;
          }
        });
        // Try to fit to view
        const box = new THREE.Box3().setFromObject(head);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        head.position.sub(center);
        const s = 0.5 / Math.max(size.x, size.y, size.z);
        head.scale.setScalar(s);
        scene.add(head);
        try { onLoad && onLoad(true); } catch {}
      },
      undefined,
      () => {
        // Loading failed; leave container empty with no crash.
        try { onLoad && onLoad(false); } catch {}
      }
    );

    const animate = () => {
      requestAnimationFrame(animate);
      // Apply morphs every frame if head present
      const state = fdRef.current;
      if (head && state && state.faceDriver) {
        head.traverse((obj) => {
          if (!obj.isMesh || !obj.morphTargetDictionary) return;
          // Reset low-weight morphs slightly to prevent buildup
          // Map faceDriver → morphs
          const d = state.faceDriver;
          // Jaw/mouth
          setFirstAvailable(obj, mapping.mouthOpenness, (d.mouthOpenness || 0) * state.liveBlend);
          // Lip Pucker
          setFirstAvailable(obj, mapping.lipPucker, (d.lipPucker || 0) * state.liveBlend);
          // Eye openness (invert into blink)
          const blink = 1 - THREE.MathUtils.clamp(d.eyeOpenness || 0.5, 0, 1);
          for (const n of mapping.eyeOpennessInv) applyMorph(obj, n, blink * state.liveBlend);
          // Eyebrows
          setFirstAvailable(obj, mapping.eyebrowHeight, (d.eyebrowHeight || 0.5) * state.liveBlend);
          // Smile/frown split across left/right if available
          const smile = THREE.MathUtils.clamp(d.smile || 0, -1, 1) * state.liveBlend;
          if (smile >= 0) {
            const w = smile;
            for (const n of mapping.smilePos) applyMorph(obj, n, w);
            for (const n of mapping.frownPos) applyMorph(obj, n, 0);
          } else {
            const w = -smile;
            for (const n of mapping.frownPos) applyMorph(obj, n, w);
            for (const n of mapping.smilePos) applyMorph(obj, n, 0);
          }
        });
      }
      renderer.render(scene, camera);
    };
    animate();

    threeRef.current = { renderer, scene };
    return () => {
      try { renderer.dispose(); } catch {}
      if (container) container.innerHTML = '';
    };
  }, [modelUrl, width, height]);

  return (
    <div ref={containerRef} style={{ width, height, background: '#0b1220' }} />
  );
}
