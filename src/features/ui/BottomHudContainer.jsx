import React from 'react';
import BottomHud from './BottomHud';

export default function BottomHudContainer({
  glowEnabled,
  leftHidden,
  rightHidden,
  sidebarWidths,
  onOpenSettings,
  onOpenFinancial,
  heightVh
}) {
  return (
    <BottomHud
      glowEnabled={glowEnabled}
      leftHidden={leftHidden}
      rightHidden={rightHidden}
      sidebarWidths={sidebarWidths}
      onOpenSettings={onOpenSettings}
      onOpenFinancial={onOpenFinancial}
      heightVh={heightVh}
    />
  );
}



