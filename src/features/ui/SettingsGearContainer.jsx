import React from 'react';
import SettingsGear from './SettingsGear';
import SettingsPanel from './SettingsPanel';

export default function SettingsGearContainer(props) {
  const {
    glowEnabled,
    settingsHoverCount,
    setShowSettings,
    showSettings,
    onHover,
    panelProps
  } = props;
  return (
    <SettingsGear
      glowEnabled={glowEnabled}
      settingsHoverCount={settingsHoverCount}
      setShowSettings={setShowSettings}
      showSettings={showSettings}
      onHover={onHover}
    >
      <SettingsPanel {...panelProps} />
    </SettingsGear>
  );
}



