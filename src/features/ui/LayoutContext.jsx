import React from 'react';
import useResizePanels from '../../hooks/useResizePanels';

export const LayoutContext = React.createContext(null);

export function LayoutProvider({ children }) {
  const value = useResizePanels();
  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = React.useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}



