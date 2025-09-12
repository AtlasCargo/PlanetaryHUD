import { useEffect } from 'react';

export default function useCursorTracking({ cursorMode, setCursorPosition }) {
  useEffect(() => {
    if (!cursorMode) return;

    const handleMouseMove = (e) => {
      // Naive mapping placeholder; real mapping can be provided by globe controller
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      const lat = (0.5 - y) * 180;
      const lng = (x - 0.5) * 360;
      setCursorPosition({ lat, lng });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [cursorMode, setCursorPosition]);
}



