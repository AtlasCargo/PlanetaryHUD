![alt text](https://github.com/AtlasCargo/PlanetaryHUD/blob/main/src/img/screen.png?raw=true)

# PlanetaryHUD

PlanetaryHUD is an interactive 3D planetary interface built with React and Three.js. It allows users to explore and interact with 3D representations of planets, providing an engaging and educational experience. The application can load interactive datasets such as population and life expectancy, displaying them on the globe or as graphs.

## Features

- Interactive 3D globe visualization
- Real-time rendering with Three.js
- User-friendly interface for exploring planetary data
- Responsive design for various screen sizes
- Ability to load and display interactive datasets like population and life expectancy on the globe or as graphs

## Technologies Used

- React: A JavaScript library for building user interfaces
- Three.js: A 3D library that makes WebGL simpler
- JavaScript: The main programming language used
- CSS: Styling the user interface
- HTML: Structure of the web application

## Installation

1. Clone the repository:
   
```bash
git clone https://github.com/AtlasCargo/PlanetaryHUD.git
```
3. Navigate to the project directory:
   
```bash
cd PlanetaryHUD
```
5. Install dependencies:
   
```bash
npm install
```
7. Start the development server:
   
```bash
npm run dev
```

## Usage

Open the application in your browser at http://localhost:3000.

Interact with the 3D globe by clicking and dragging to rotate, and scrolling to zoom in and out.

Explore different features and datasets available on the interface.

## ASCII Mode

For a low‑power, text‑only rendering, open `/ascii`.

- Modes: Flat Map (GeoJSON), Globe (software, land‑mask based), Globe (WebGL experimental)
- Typical size: 160×90 chars (~800×450) at 1 fps
- Data prep: `npm run prepare-ascii-borders` to generate `public/geo/countries.geojson`

See `docs/ascii.md` for details and roadmap.

## Mobile Support (P1)

- Orientation prompt on portrait for globe with rotate or mini‑globe preview.
- Safe‑area insets for iOS notch (top/bottom/center).
- Sidebars become drawers on small screens; edge openers provided.
- Touch tuning: long‑press to pin tooltip, passive listeners, tooltip clamped within center pane below top HUD.

See `docs/project.mdc` and `AGENTS.md` for protocol and current state.

## Contributing

Contributions are welcome! Please follow these steps:

Fork the repository.
Create a new branch for your feature or bug fix.
Commit your changes with a descriptive message.
Push your changes to your fork.
Submit a pull request to the main repository.

## License
This project is licensed under the MIT License.
