import { useEffect, useState } from 'react';

export default function useResizePanels(initial = {}) {
  const [sidebarWidths, setSidebarWidths] = useState(() => ({
    left: initial.left ?? (window.innerWidth <= 768 ? (window.innerWidth > window.innerHeight ? 15 : 80) : 20),
    right: initial.right ?? (window.innerWidth <= 768 ? (window.innerWidth > window.innerHeight ? 15 : 80) : 20)
  }));
  const [dimensions, setDimensions] = useState(() => ({
    top: initial.top ?? (typeof window !== 'undefined' ? (60 / window.innerHeight) * 100 : 10),
    bottom: initial.bottom ?? (typeof window !== 'undefined' ? (60 / window.innerHeight) * 100 : 10)
  }));
  const [isResizing, setIsResizing] = useState({ left: false, right: false, top: false, bottom: false });

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
    };

    if (isResizing.left || isResizing.right || isResizing.top || isResizing.bottom) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return { sidebarWidths, dimensions, isResizing, setIsResizing, setSidebarWidths, setDimensions };
}



