import { useEffect } from 'react';

export default function useKeyboardShortcuts({ cursorMode, cursorHoverCountry, setCursorCountry }) {
  useEffect(() => {
    if (!cursorMode) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case ' ':
          if (cursorHoverCountry) {
            setCursorCountry(cursorHoverCountry);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cursorMode, cursorHoverCountry, setCursorCountry]);
}



