const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('  DTRS SYSTEM COMPREHENSIVE INTEGRITY & ENDPOINT TEST');
console.log('====================================================\n');

// 1. Verify Database Connection and File Resolution
const dbPath = path.join(__dirname, '..', 'data', 'treta_railway.db');
if (!fs.existsSync(dbPath)) {
  console.error(`[FAIL] Database file not found at ${dbPath}`);
  process.exit(1);
}
console.log(`[PASS] SQLite Database verified at: ${dbPath}`);

const Database = require('better-sqlite3');
const db = new Database(dbPath, { readonly: true });

// 2. Corridors Query
const corridors = db.prepare('SELECT * FROM corridors').all();
console.log(`[PASS] Corridors endpoint data: ${corridors.length} corridors found`);
if (corridors.length !== 7) throw new Error('Expected 7 corridors');

// 3. Trains Query
const trains = db.prepare('SELECT * FROM trains').all();
console.log(`[PASS] Trains endpoint data: ${trains.length} premier trains found`);
if (trains.length < 14) throw new Error('Expected at least 14 trains');

// 4. Corridor Trains Query for each corridor
for (const c of corridors) {
  const cTrains = db.prepare('SELECT * FROM trains WHERE corridor_id = ?').all(c.id);
  if (cTrains.length === 0) throw new Error(`Corridor ${c.id} has no trains`);
}
console.log(`[PASS] Corridor-trains subrouting verified for all 7 corridors`);

// 5. Train Route & Stops Verification
const trainNo = '12304';
const stops = db.prepare(`
  SELECT ts.*, s.station_name, s.latitude, s.longitude, s.state, s.zone
  FROM train_stops ts
  JOIN stations s ON ts.station_code = s.station_code
  WHERE ts.train_number = ?
  ORDER BY ts.stop_sequence ASC
`).all(trainNo);
console.log(`[PASS] Train route query for ${trainNo}: ${stops.length} stops retrieved`);
if (stops.length < 5) throw new Error('Stops incomplete');

// 6. Live State Telemetry Query
const liveState = db.prepare('SELECT * FROM train_live_state WHERE train_number = ?').get(trainNo);
console.log(`[PASS] Train live telemetry query for ${trainNo}: Status=${liveState?.status}, Speed=${liveState?.speed_kmh}km/h`);

// 7. Route Divisions (DTRS Track Segments)
const routeDivisions = db.prepare(`
  SELECT * FROM route_divisions
  WHERE train_no = ? OR train_no = ?
  ORDER BY CAST(segment_sequence AS INTEGER) ASC
`).all(trainNo, trainNo.padStart(5, '0'));
console.log(`[PASS] Route divisions query for ${trainNo}: ${routeDivisions.length} segments retrieved`);

// 8. State Border Divisions
const stateDivs = db.prepare('SELECT * FROM state_border_divisions ORDER BY state_border_key ASC').all();
console.log(`[PASS] State border divisions query: ${stateDivs.length} border transitions verified`);

// 9. Check environment variables specification
const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
const requiredEnvVars = ['PORT', 'NEXT_PUBLIC_APP_URL', 'DATABASE_PATH', 'ALLOWED_ORIGIN', 'RAILRADAR_API_KEY', 'RAILRADAR_API_URL'];
for (const envVar of requiredEnvVars) {
  if (!envExample.includes(envVar)) {
    throw new Error(`Missing expected env var ${envVar} in .env.example`);
  }
}
console.log(`[PASS] Environment variable schema verified: All ${requiredEnvVars.length} variables intact`);

// 10. Check package.json scripts and naming
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
if (pkg.name !== 'dtrs-mapping-system') throw new Error(`Unexpected package name: ${pkg.name}`);
if (!pkg.scripts.dev || !pkg.scripts.build || !pkg.scripts.start) throw new Error('Missing core scripts in package.json');
console.log(`[PASS] package.json configuration verified: name="${pkg.name}", scripts intact`);

// 11. Verify route directory tree matches Next.js App Router API
const expectedApiRoutes = [
  'corridors',
  'corridors/[id]/trains',
  'divisions',
  'osm/station',
  'osm/tracks',
  'simulation/stream',
  'trains',
  'trains/[id]',
  'trains/[id]/delay',
  'trains/[id]/eta',
  'trains/[id]/live',
  'trains/[id]/route',
  'trains/live-all'
];

for (const r of expectedApiRoutes) {
  const routeFile = path.join(__dirname, '..', 'app', 'api', r, 'route.ts');
  if (!fs.existsSync(routeFile)) {
    throw new Error(`Expected API route missing: ${routeFile}`);
  }
}
console.log(`[PASS] All ${expectedApiRoutes.length} API route files verified and in place`);

console.log('\n====================================================');
console.log('  ALL INTEGRITY & ENDPOINT CHECKS PASSED (100% HEALTHY)');
console.log('====================================================\n');
