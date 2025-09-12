import React from 'react';
import TopHud from './TopHud';

export default function TopHudContainer({
  visible,
  glowEnabled,
  dimensionsTop,
  warRoomMode,
  leftHidden,
  rightHidden,
  sidebarWidths,
  isResizing,
  setIsResizing,
  isLoggedIn,
  setMode,
  setShowFinancial,
  setShowGraph,
  setWarRoomMode,
}) {
  if (!visible) return null;
  return (
    <TopHud
      data-test="top-hud"
      glowEnabled={glowEnabled}
      dimensionsTop={dimensionsTop}
      warRoomMode={warRoomMode}
      leftHidden={leftHidden}
      rightHidden={rightHidden}
      sidebarWidths={sidebarWidths}
      isResizing={isResizing}
      setIsResizing={setIsResizing}
      isLoggedIn={isLoggedIn}
      setMode={setMode}
      setShowFinancial={setShowFinancial}
      setShowGraph={setShowGraph}
      setWarRoomMode={setWarRoomMode}
    />
  );
}


