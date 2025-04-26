module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sciFi: ['Orbitron', 'sans-serif'],
      },
      colors: {
        'neon-blue': '#00e6ff',
        'neon-green': '#00ff85',
        'neon-pink': '#ff00c8',
        'neon-yellow': '#ffff00',
        'neon-purple': '#a900ff',
        'neon-orange': '#ff8c00',
        'neon-red': '#ff0000',
        'gray-900': '#1A1A1A',
        'gray-800': '#2A2A2A',
        'gray-700': '#3A3A3A',
        'neon-cyan': '#00ffff',
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'landscape': {'raw': '(orientation: landscape)'},
        'portrait': {'raw': '(orientation: portrait)'},
      },
      height: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      minHeight: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      maxHeight: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      dropShadow: {
        'neon-glow': '0 0 10px rgba(0, 230, 255, 0.7)',
      }
    },
  },
  plugins: [],
};
