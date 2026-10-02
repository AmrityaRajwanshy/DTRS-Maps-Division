#  Treta Mapping System — SIH 26028

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-green?style=flat&logo=leaflet)](https://leafletjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=flat&logo=sqlite)](https://github.com/WiseLibs/better-sqlite3)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![SIH Problem Statement](https://img.shields.io/badge/SIH%202024-Problem%2026028-orange?style=flat)](https://www.sih.gov.in/)

> **Next-Generation Railway GIS Visualization, Real-Time Train Kinematics & Dynamic Delay/ETA Forecasting Engine for Indian Railways.**

---

##  Overview

The **Treta Mapping System** is a GIS platform and dynamic ETA forecasting engine developed for **Smart India Hackathon (Problem Statement 26028)**. 

The system solves the challenge of unpredictable railway delays by integrating official train timetable databases with real OpenStreetMap railway geometries, simulated train kinematics, downstream delay propagation, and junction buffer (slack) absorption.

---

##  Core Features

### 1. ️ True Track GIS Route Visualization
* **High-Definition OpenRailwayMap Track Polylines**: Renders actual railway track curves and corridor alignments instead of basic point-to-point straight lines.
* **Animated Realistic Train Marker**: Locomotive marker rotates in real-time to match the exact track bearing (heading).
* **Interactive Station Waypoints**: Origin, intermediate halts, and terminus stations with platform numbers, distance markers, and live status tooltips.
* **Station Intelligence Modal**: Click any station to inspect scheduled arrival/departure, halt duration, dynamic ETA, and delay root-cause attribution.

### 2.  Dynamic ETA & Slack Absorption Engine
* Calculates real-time arrival forecasts downstream when delays occur.
* **Timetable Buffer Absorption**: Models timetable recovery minutes ("slack") between junctions so minor delays gradually recover over long distances.

### 3.  Real-Time Kinematics & Telemetry HUD
* **Active Train & Dispatch Status**: Real-time train number, name, and on-time compliance.
* **Speedometer / Velocity Gauge**: Live speed in km/h with cruising vs. station dwell status.
* **Active Block Segment**: Real-time *current station  next station* indicator with remaining section kilometers.
* **Terminus ETA**: Live dynamic arrival estimate compared against scheduled timetable.
* **Route Progress Bar**: Gradient neon route completion percentage.

### 4.  Real-Time Simulation Controls
* **Simulation Engine**: Play, Pause, Reset, Next Station, and Previous Station steppers.
* **Speed Multipliers**: `1x`, `2x`, `5x`, `10x` simulation speeds for quick demonstrations.
* **Interactive Route Scrubber**: Drag-and-drop slider for jumping train positions along the track.

### 5.  100% Multi-Device Responsive Design
* **Tablets & Slates (iPad Air 820px, iPad Mini 768px, iPad Pro 1024px, Surface Pro)**:
  * Full side-by-side workspace: GIS Map (7 cols) + Ordered Stoppage Schedule (5 cols) simultaneously visible.
  * 4-column panoramic telemetry bar.
* **Smartphones (iPhone SE, iPhone 12–16 Pro, Galaxy Z Fold 5, Galaxy S8/S20, Pixel 7–10)**:
  * Mobile native touch pickers for 1-tap Corridor and Train selection.
  * Efficient 2×2 Telemetry HUD saving over 50% vertical screen space.
  * Tabbed workspace toggle: `[️ Map]` / `[ Stops]` / `[ Both]`.
  * Mobile-safe popups constrained to `max-w-[85vw]` to prevent screen clipping.
* **Automatic `ResizeObserver`**: Instantly refits map tiles with `map.invalidateSize()` on orientation changes and window resizing.

---

##  Seeded Corridors & Trains (14 Trains / 7 Corridors)

Ingested and verified directly from the official SIH dataset:

| # | Railway Corridor | Origin  Destination | Seeded Trains |
|---|---|---|---|
| **1** | **Delhi → Guwahati** | Anand Vihar / Old Delhi  Kamakhya | `12506` North East Express<br>`15657` Brahmaputra Mail |
| **2** | **Delhi → Howrah** | New Delhi  Howrah Jn | `12302` NDLS–HWH Rajdhani Express<br>`12304` Poorva Express *(Primary Demo)* |
| **3** | **Delhi → Chennai** | New Delhi  Chennai Central | `12622` Tamil Nadu Express<br>`12616` Grand Trunk Express |
| **4** | **Delhi → Mumbai** | New Delhi / Nizamuddin  Mumbai Central | `12952` Mumbai Rajdhani Express<br>`12954` August Kranti Rajdhani |
| **5** | **Mumbai → Chennai** | CSMT Mumbai  Chennai Central | `22159` Mumbai–Chennai Express<br>`11027` Mumbai–Chennai Mail |
| **6** | **Mumbai → Howrah** | CSMT Mumbai  Howrah Jn | `12322` Kolkata Mail<br>`12859` Gitanjali Express |
| **7** | **Chennai → Howrah** | Chennai Central  Howrah Jn | `12842` Coromandel Express<br>`12840` Chennai–Howrah Mail |

---

## ️ Project Architecture

```
treta-mapping-system/
├── app/                                 # Next.js App Router
│   ├── page.tsx                         # Main Dashboard & Interactive Operations Center
│   ├── layout.tsx                       # Root layout & Viewport configuration
│   ├── globals.css                      # Tailwind styling, Leaflet fixes & animations
│   └── api/                             # RESTful Backend API Endpoints
│       ├── corridors/route.ts           # Corridor listing endpoint
│       ├── trains/                      # Train listing & corridor filtering
│       │   ├── route.ts                 # GET /api/trains?corridor={id}
│       │   └── [id]/                    # Individual train endpoints
│       │       ├── route/route.ts       # Ordered stops & station coordinates
│       │       ├── eta/route.ts         # Dynamic ETA prediction & downstream slack
│       │       └── delay/route.ts       # Delay injection & reset
│       ├── osm/corridor-track/route.ts  # Overpass / OSM real railway geometry
│       └── simulation/                  # Live train physics & simulation tick engine
├── components/railway/                  # UI Components
│   ├── RailwayMap.tsx                   # Leaflet map, track polylines & animated train
│   ├── MapWrapper.tsx                   # Dynamic client-side wrapper (SSR-safe)
│   ├── TrainSelector.tsx                # Dynamic Corridor & Train switcher
│   ├── SimulationControls.tsx           # Play / Pause / Reset / Speed multiplier
│   ├── TelemetryBar.tsx                 # Live Speed, Segment, Heading & Progress HUD
│   ├── StationPopup.tsx                 # Clickable station intelligence modal
│   ├── StopsTimeline.tsx                # Vertical itinerary & scheduled vs. predicted stop times
│   └── DelayAttributionPanel.tsx        # Delay injection & root-cause simulation
├── lib/                                 # Business Logic & Computational Engines
│   ├── db.ts                            # SQLite connection & typed database queries
│   ├── eta-engine.ts                    # Dynamic ETA calculation with buffer absorption
│   ├── trackGeometry.ts                 # Polyline distance, bearing & track interpolation
│   ├── simulation.ts                    # Train state machine (RUNNING, STOPPED, RESTRICTED)
│   └── osm.ts                           # OpenStreetMap railway line fetcher & caching
├── data/                                # Persistent Storage
│   └── treta_railway.db                 # SQLite database (Corridors, Trains, Stops, Events)
└── scripts/                             # Database Utilities
    ├── seed_db.js                       # Ingests official Excel data into SQLite
    └── test_db.js                       # Comprehensive database verification suite
```

---

##  Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/treta-mapping-system.git
   cd treta-mapping-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Seed SQLite Database**:
   ```bash
   npm run seed
   ```

4. **Verify Database Integrity**:
   ```bash
   npm run test-db
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

6. Open **[http://localhost:3000](http://localhost:3000)** (or the port displayed in your terminal) in your browser.

---

##  API Reference

| Endpoint | Method | Query / Body Parameters | Description |
|---|---|---|---|
| `/api/corridors` | `GET` | — | Returns all 7 railway trunk corridors |
| `/api/trains` | `GET` | `?corridor={corridor_id}` | Returns trains operating on the selected corridor |
| `/api/trains/:id/route` | `GET` | `:id = train_number` | Ordered station stops, platform numbers, and GPS coordinates |
| `/api/trains/:id/eta` | `GET` | `:id = train_number` | Computes dynamic ETAs with slack recovery for downstream stops |
| `/api/trains/:id/delay` | `POST` | `{ station_code, delay_minutes, cause_type, cause_description }` | Injects a simulated delay event at a specific station |
| `/api/trains/:id/delay` | `DELETE` | — | Clears all injected delays back to timetable baseline |
| `/api/osm/corridor-track` | `GET` | `?corridor={corridor_id}` | Retrieves real OpenRailwayMap track geometries |

---

##  Testing & Validation

### Validate TypeScript Compilation
```bash
npx tsc --noEmit
```

### Build for Production
```bash
npm run build
npm run start
```

---

##  Smart India Hackathon (SIH 2024)
* **Problem Statement ID**: 26028
* **Theme**: Transportation & Logistics / Smart Railway Operations
* **Target User**: Indian Railways Passenger & Controller Operations Systems
