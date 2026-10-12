# OSIRIS - Global Intelligence & OSINT Dashboard

A production-ready, real-time global intelligence and OSINT dashboard inspired by World Monitor (worldmonitor.app). Built with React 18, Vite, Tailwind CSS, and Express.js with native WebSockets.

<img width="2940" height="1664" alt="image" src="https://github.com/user-attachments/assets/975a9587-938c-409d-9e9e-3c9e86addbd6" />


<img width="2940" height="1664" alt="image" src="https://github.com/user-attachments/assets/acb3664c-b797-4885-b2dd-caf27bd7951b" />


<img width="2940" height="1664" alt="image" src="https://github.com/user-attachments/assets/324d5567-a9b4-41ea-91f8-005eeac3c294" />


<img width="2940" height="1664" alt="image" src="https://github.com/user-attachments/assets/71e2fc23-2bde-4a7b-9e0e-e4c66bbf26c5" />


<img width="2940" height="1664" alt="image" src="https://github.com/user-attachments/assets/3c334d0d-c433-41c8-9b57-b18b6a20c2bd" />


<img width="2940" height="1664" alt="image" src="https://github.com/user-attachments/assets/94a4e17c-e267-4d7c-916a-ef70ac0dd565" />


<img width="2940" height="1664" alt="image" src="https://github.com/user-attachments/assets/db3a13c7-c7ec-4398-86f3-89983372f309" />


<img width="2940" height="1664" alt="image" src="https://github.com/user-attachments/assets/3805c144-1798-45a8-a865-54e99ae4290f" />


<img width="2940" height="1664" alt="image" src="https://github.com/user-attachments/assets/da0abb5e-9259-430b-832c-f37b8d33102b" />










## Features

### Interactive Tactical Dark Map
- Dark CartoDB base map with WebGL rendering
- 6 main layer groups with 24+ individual layers:
  - **Geopolitics**: Active conflicts, CISA KEV exploits, civil unrest, satellite orbits
  - **Maritime**: AIS vessel tracking, chokepoints, dark fleet detection
  - **Aviation**: ADS-B flight paths, military aircraft, GPS jamming H3 grid
  - **Infrastructure**: Submarine cables, internet outages (IODA), power grid
  - **Physical**: USGS earthquakes, NASA FIRMS wildfires, extreme weather
  - **Cyber**: C2 botnets, phishing hosts, DDoS attacks, malware families

### Real-Time Data Ingestion
- Multi-feed polling with circuit breakers and fallback caching
- Live endpoints: CISA KEV, USGS Earthquakes, OpenSky ADS-B, ThreatFox, URLhaus
- Normalized event schema with severity, category, geolocation, metadata
- WebSocket streaming to frontend with auto-reconnection

### Command Palette & Global Search (Cmd+K)
- Fuzzy search across events, layers, countries, CVEs, flight callsigns
- Hotkeys for rapid layer switching and country dossier access

### Country Instability Index (CII)
- Live scoring based on conflict density, news velocity, EW activity
- Interactive sidebar with breaking news tickers and raw intel stream

### Premium Tactical UI/UX
- Dark cyber-HUD aesthetic (#07090e background, neon accents)
- Glassmorphism panels with collapsible sidebars
- Real-time connection status pulse indicator
- Responsive layout optimized for command centers

### Sharing & Export
- URL state encoding (map position, active layers, selected event)
- One-click JSON/CSV export of visible events

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone and install
git clone <repository>
cd osiris
npm install

# Start development (runs both frontend and backend)
npm run dev:full

# Or run separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

## Architecture

```
osiris/
├── src/
│   ├── components/          # React components
│   │   ├── MapCanvas.jsx    # Leaflet map with all layer renderers
│   │   ├── LayerControlPanel.jsx   # Layer toggles with groups
│   │   ├── EventSidebar.jsx        # Real-time event feed
│   │   ├── CountryDossier.jsx      # CII and country details
│   │   ├── CommandPalette.jsx      # Cmd+K search interface
│   │   ├── TopBar.jsx              # Header with stats
│   │   ├── StatusBar.jsx           # Footer with layer counts
│   │   ├── CIIHUD.jsx              # Instability index overlay
│   │   ├── ConnectionIndicator.jsx # WS status panel
│   │   └── ExportModal.jsx         # Export dialog
│   ├── context/             # React Context providers
│   │   ├── EventContext.jsx        # Event state management
│   │   ├── WSContext.jsx           # WebSocket connection
│   │   ├── MapLayerContext.jsx     # Layer visibility state
│   │   └── UIContext.jsx           # UI state (sidebars, modals)
│   ├── hooks/               # Custom React hooks
│   │   ├── useCommandPalette.js    # Command palette logic
│   │   ├── useURLState.js          # URL hash state sync
│   │   └── useHotkeys.js           # Global keyboard shortcuts
│   ├── utils/
│   │   ├── helpers.js              # Utility functions
│   │   └── constants.js            # Configuration constants
│   └── styles/
│       └── globals.css             # Tailwind + custom styles
├── server/
│   ├── index.js             # Express + WebSocket server
│   └── workers/
│       └── ingestion.js     # OSINT data ingestion workers
├── public/
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open Command Palette |
| `Esc` | Close panels/modals |
| `R` | Reset layers to defaults |
| `Shift + A` | Enable all layers |
| `Shift + D` | Disable all layers |
| `F` | Clear filters |
| `X` | Clear selection |
| `M` | Start measure mode |
| `Cmd/Ctrl + Shift + F` | Toggle fullscreen |
| `?` | Open help |

## Data Sources

| Source | Endpoint | Category |
|--------|----------|----------|
| USGS | earthquakes/feed/v1.0/summary/all_hour.geojson | Earthquakes |
| CISA | known_exploited_vulnerabilities.json | KEV Exploits |
| OpenSky | api/states/all | ADS-B Flights |
| ThreatFox | export/json/recent/ | C2 Botnets |
| URLhaus | downloads/json/ | Phishing Hosts |
| NASA FIRMS | API (requires key) | Wildfires |
| IODA | api/outages | Internet Outages |

## Configuration

Environment variables:
- `PORT` - Backend server port (default: 3001)
- `NASA_FIRMS_KEY` - NASA FIRMS API key for real wildfire data

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, Framer Motion, Lucide React
- **Mapping**: React-Leaflet (Leaflet 1.9)
- **Backend**: Express.js, native WebSockets (ws)
- **Data**: node-fetch, async workers with circuit breakers
- **Language**: Pure JavaScript (ES2023+), ES Modules

## License

MIT License - Open source for the intelligence community.
