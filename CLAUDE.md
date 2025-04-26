# CLAUDE.md - Development Guide

## Build & Development Commands
- `yarn start` - Start development server
- `yarn build` - Build for production

## Project Technology Stack
- React.js 18 with functional components & hooks
- Three.js/Three-Globe for 3D visualization
- TailwindCSS for styling
- D3.js for data visualization

## Key File Structure
- `/src/components/ReactGlobeExample.jsx` - Main container component
- `/src/components/Globe.jsx` - Globe visualization wrapper
- `/src/components/GraphComponent.jsx` - Data graphing component
- `/src/utils/loadDataset.js` - Data loading utilities
- `/src/components/Effects/` - Visual effects components

## Data Structures
- **Dataset format**: `{id, title, category}`
- **Item format**: `{entity, year, value, metric}`
- **Primary datasets**: 'life-expectancy', 'population', 'gdp-per-capita-worldbank'

## API Endpoints
- `https://ourworldindata.org/grapher/{dataset}.csv` - Main data source
- Images stored in `/public/textures/`

## Key State Management
- Global datasets: `lifeExpData`, `populationData`
- Selection state: `selectedRegion`, `selectedLifeExpYear`, `yearRange`
- View toggles: `showGraph`, `showGlobe`, `activeGlobeDataset`

## Code Style Guidelines
- **Components**: Use functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Files**: .jsx extension for React components, .js for utilities
- **State**: Prefer local state with useState, useRef for DOM references

## Common Operations
- Data fetching: Use `loadDataset(id)` from loadDataset.js
- Year selection: Update appropriate state and use `useEffect` to refresh data
- Region filtering: Filter data based on selected region

## Performance Considerations
- Use `useMemo`/`useCallback` for expensive calculations
- Implement conditional rendering to minimize DOM updates
- Apply throttling for real-time controls (e.g., sliders)
- Clean up fetch requests and event listeners in useEffect returns