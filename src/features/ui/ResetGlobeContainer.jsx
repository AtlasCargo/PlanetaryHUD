import React from 'react';
import GlobeResetButton from './GlobeResetButton';

export default function ResetGlobeContainer({ visible, onClick }) {
  if (!visible) return null;
  return <GlobeResetButton onClick={onClick} />;
}



