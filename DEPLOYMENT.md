#  Treta Mapping System — Standalone Extraction & Deployment Guide

This document describes how to extract the **`Mapping System`** folder out of this repository and deploy it as an **independent, self-contained microservice or standalone web application**.

---

##  What is inside `Mapping System`?

The `Mapping System` is a complete, self-contained Next.js GIS platform containing:
- **Full True-Track Railway GIS visualization**: OpenRailwayMap track geometries, Leaflet vector polylines, animated locomotive markers.
- **Dynamic ETA & Kinematics Engine**: Real-time speedometers, block occupancy, timetable buffer slack absorption, and delay propagation.
- **Embedded SQLite Database**: `data/treta_railway.db` containing all 7 Golden Quadrilateral corridors, 96 major railway stations, and 14 premier trains with stop schedules and telemetry records.
- **Complete REST API Endpoints**:
  - `GET /api/corridors` — List corridors and train counts
  - `GET /api/trains` — List trains (with optional `?corridor=<id>` filter)
  - `GET /api/trains/[id]/route` — Full stop sequence with coordinates & scheduled halts
  - `GET /api/trains/[id]/eta` — Dynamic ETA predictions and downstream delay shock
  - `POST /api/trains/[id]/delay` — Inject or reset simulated delays
  - `GET /api/osm/corridor-track` — OpenStreetMap rail geometry polylines
  - `GET /api/simulation` — Kinematic tick physics calculations

---

## ️ How to Extract Out

To extract this system into its own standalone repository or server:

1. **Copy or move the `Mapping System` folder** to any destination of your choice:
   ```bash
   cp -r "Mapping System" /path/to/treta-mapping-standalone
   cd /path/to/treta-mapping-standalone
   ```

2. **Initialize Git (optional)**:
   ```bash
   git init
   git add .
   git commit -m "feat: extracted Treta Mapping System as standalone microservice"
   ```

3. **Verify Self-Containment**:
   All files inside `Mapping System` (including SQLite database `data/treta_railway.db`, scripts, and Next.js routes) are 100% self-referencing. There are NO external path dependencies on the parent project.

---

## ️ Environment Configuration

Copy the example configuration:
```bash
cp .env.example .env
```

Available variables:
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP Port for the service |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | Publicly accessible URL |
| `DATABASE_PATH` | `./data/treta_railway.db` | Path to SQLite database file |
| `ALLOWED_ORIGIN` | `*` | Allowed CORS origins for external web dashboards |

---

##  Run Methods

### Method 1: Local Node.js Development / Production
```bash
# 1. Install dependencies
npm install

# 2. Verify database integrity
npm run test-db

# 3. Start local development server (runs on port 3001 by default)
npm run dev

# 4. Or build and start production server
npm run build
npm run start
```

### Method 2: Docker Container Deployment (Recommended)
A production-ready `Dockerfile` is included.

```bash
# Build Docker image
docker build -t treta-mapping-system:latest .

# Run container on port 3001
docker run -d --name treta-mapping -p 3001:3001 -e PORT=3001 treta-mapping-system:latest

# Check logs
docker logs -f treta-mapping
```

### Method 3: Cloud Platforms (Railway / Render / AWS ECS / Fly.io / Vercel)
- **Railway / Render**: Connect repository, select root directory or set build command `npm install && npm run build` and start command `npm run start`.
- **Docker PaaS**: Use the included multi-stage `Dockerfile`.
- **Port**: Set `PORT=3001` (or let the platform inject `$PORT`).

---

##  Connecting External Codebases (Iframe & API Interoperability)

The standalone Mapping System is designed to connect back to any parent dashboard:

### 1. Iframe Embedding with URL Parameters
You can embed the Mapping System inside an iframe:
```html
<iframe
  src="http://localhost:3001/?embed=true&train=12304&corridor=delhi-howrah"
  width="100%"
  height="700px"
  style="border: none; border-radius: 12px;"
/>
```
- `embed=true` activates embedded mode (streamlined header with pop-out button).
- `train=12304` pre-selects the specified train.
- `corridor=delhi-howrah` pre-selects the specified railway corridor.

### 2. Window PostMessage Protocol
Parent applications can dynamically control the Mapping System without reloads:

```javascript
const iframe = document.getElementById('mapping-iframe');

// 1. Switch active train
iframe.contentWindow.postMessage({
  type: 'SELECT_TRAIN',
  trainNumber: '12302'
}, '*');

// 2. Switch corridor
iframe.contentWindow.postMessage({
  type: 'SELECT_CORRIDOR',
  corridorId: 'delhi-mumbai'
}, '*');

// 3. Control simulation
iframe.contentWindow.postMessage({
  type: 'SET_PLAYBACK',
  isPlaying: true,
  speed: 5
}, '*');
```

And listen for train changes from the Mapping System:
```javascript
window.addEventListener('message', (event) => {
  if (event.data?.type === 'MAPPING_TRAIN_CHANGED') {
    console.log('User picked train in Mapping System:', event.data.trainNumber);
  }
});
```

### 3. Direct REST API Consumption
Because CORS headers (`Access-Control-Allow-Origin: *`) are pre-configured in `next.config.mjs`, external frontends can directly call:
```javascript
const res = await fetch('http://localhost:3001/api/trains/12304/route');
const routeData = await res.json();
```
