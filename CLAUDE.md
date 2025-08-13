# CLAUDE.md - Development Guide

## Build & Development Commands
- `npm run dev` - Run backend (Express) and frontend together
- `npm start` - Start frontend dev server only
- `npm run start-server` - Start backend server only
- `npm run build` - Build for production

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

## New Functionalities
- GDP per capita visualization
  - Fetch per-country GDP per capita via World Bank API with pagination support
  - Color globe countries by GDP value using D3 color scales
  - Interactive tooltip displaying GDP per capita for selected country and year
  - Year range slider for animating global GDP changes over time
- Improved data loading
  - Full error handling and logging in `loadDataset.js`
  - Support for ISO2 codes and world-level indicators

## Chat Interface
- Mini-chat widget in lower left panel:
  - Always-visible input field and Send button when not in full-chat mode.
  - Top of left div shows Chat icon ●, Hamburger menu ☰, and Home button 🏠 to toggle views.
- Chat mode behavior:
  - Clicking Chat icon switches left sidebar to chat history log.
  - Center panel becomes full chat window displaying messages.
  - Message input at bottom of chat window for sending new messages.
- Home button returns left panel to dataset selector and center panel to globe/graph view.

## Settings Interface
- Settings view embedded in central panel (no full-page route change).
  - Triggered by Account menu in hamburger dropdown or top-left Account icon.
  - Renders `/pages/Settings` component inside the main view.
  - Left sidebar header shows Home button 🏠 in settings mode for returning to home.
  - Maintains mini-chat and globe state; mode `'settings'` added alongside `'home'` and `'chat'`.

## Authentication & Login
Implemented real authentication flow:

    Server‐side (server/index.js):

        1. Enabled CORS with credentials.
        2. Synced lowdb on every request to avoid stale cache.
        3. Added /api/auth/check-email to tell if an email already exists.
        4. Added helper comments/logs (patched supertest) – still kept in place.

    Client:

        1. src/services/authClient.js – thin wrapper for:
           • signup, login, checkEmail, getMe
           • OAuth popup helper.
        2. src/contexts/AuthProvider.jsx
           • Global React context with:
             – continueWithEmail()  (decides sign-up vs log-in)
             – continueWithGoogle / GitHub (popup + postMessage)
             – logout, user, token, loading
           • Persists JWT in localStorage and bootstraps session.
        3. Wrapped whole app with <AuthProvider> (src/index.js).
        4. Added CORS credentials and db.read synchroniser.

    Now:
    • “Continue with Google / GitHub” hits backend /api/auth/google|github and
    receives token via postMessage.
    • “Continue with E-mail” first POSTs /api/auth/check-email; if exists → login,
    else → signup.
    • Global hook useAuth() available anywhere in the UI.

    No UI changes were required; integrate hook in your sidebar/login component as:

        const { continueWithEmail, continueWithGoogle } = useAuth();

    Everything else (JWT handling, user state) is automatic.