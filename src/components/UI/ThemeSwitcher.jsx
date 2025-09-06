import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeSwitcher() {
  const { currentTheme, themes, switchTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (themeName) => {
    console.log(`ThemeSwitcher: Switching to theme: ${themeName}`);
    switchTheme(themeName);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:text-neon-blue transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
        </svg>
        Themes
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-gray-800 border border-neon-blue/20 rounded-lg shadow-lg z-[100000] liquid-glass-dropdown pointer-events-auto">
          <div className="p-3 border-b border-neon-blue/20">
            <h3 className="text-sm font-semibold text-neon-blue">Select Theme</h3>
          </div>
          
          <div className="p-2">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                  currentTheme === key
                    ? 'bg-neon-blue/20 border border-neon-blue/40 text-neon-blue'
                    : 'hover:bg-gray-700/50 text-white hover:text-neon-blue'
                }`}
              >
                <div className="font-medium">{theme.name}</div>
                <div className="text-xs text-gray-400 mt-1">{theme.description}</div>
                {currentTheme === key && (
                  <div className="text-xs text-neon-blue mt-1">✓ Active</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
