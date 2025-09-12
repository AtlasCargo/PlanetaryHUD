import { useEffect } from 'react';

export default function useCpuMonitor({ enableCpuMonitor, updateFPS, setCpuUsage }) {
  useEffect(() => {
    if (!enableCpuMonitor) return;
    let lastTime = performance.now();
    let frameCount = 0;
    let rafId;

    const targetFPS = Math.max(10, Math.min(updateFPS || 30, 120));
    const checkLoad = () => {
      const now = performance.now();
      frameCount++;
      if (now >= lastTime + 1000) {
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
  }, [enableCpuMonitor, updateFPS, setCpuUsage]);
}



