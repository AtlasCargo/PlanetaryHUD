import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeDebug() {
  const { currentTheme, isLiquidGlassActive } = useTheme();
  
  // Check if theme class is actually applied to body
  const bodyThemeClass = document.body.className.includes('theme-') 
    ? document.body.className.match(/theme-\w+/)?.[0] 
    : 'none';
  
  // Check if CSS variables are set
  const cssVars = {
    '--bg-primary': getComputedStyle(document.documentElement).getPropertyValue('--bg-primary'),
    '--text-secondary': getComputedStyle(document.documentElement).getPropertyValue('--text-secondary'),
    '--border-primary': getComputedStyle(document.documentElement).getPropertyValue('--border-primary'),
  };

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded text-xs z-[9999] border border-white/20">
      <div><strong>Theme Debug:</strong></div>
      <div>Current Theme: {currentTheme}</div>
      <div>Liquid Glass Active: {isLiquidGlassActive ? 'Yes' : 'No'}</div>
      <div>Body Class: {bodyThemeClass}</div>
      <div>CSS Vars:</div>
      {Object.entries(cssVars).map(([key, value]) => (
        <div key={key} className="ml-2">
          {key}: {value || 'not set'}
        </div>
      ))}
    </div>
  );
}


