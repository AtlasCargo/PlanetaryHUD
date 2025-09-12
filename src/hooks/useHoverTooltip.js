import { useCallback, useRef } from 'react';
import eventBus from '../shared/events/eventBus';
import { Events } from '../shared/events/contracts';

export default function useHoverTooltip({ setHoverD, setTooltipPosition }) {
  const raf = useRef(null);

  const handleHover = useCallback((hoveredCountry, event) => {
    setHoverD && setHoverD(hoveredCountry || null);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const hasCoords = event && typeof event.clientX === 'number' && typeof event.clientY === 'number';
      if (hoveredCountry && hasCoords) {
        const x = event.clientX;
        const y = event.clientY;
        setTooltipPosition && setTooltipPosition({ x, y });
        const name = hoveredCountry?.properties?.ADMIN || hoveredCountry?.properties?.name || 'Unknown';
        const region = hoveredCountry?.properties?.region || hoveredCountry?.properties?.REGION_UN || '';
        const content = (
          <div>
            <div className="font-bold text-lg">{name}</div>
            {region ? <div className="text-xs opacity-80">{region}</div> : null}
          </div>
        );
        eventBus.emit(Events.UiTooltipShow, { x, y, content });
      } else {
        // Do not show with missing coords or null hover target
        eventBus.emit(Events.UiTooltipHide);
      }
    });
  }, [setHoverD, setTooltipPosition]);

  return { handleHover };
}


