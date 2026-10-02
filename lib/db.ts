import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;

function resolveDatabasePath(): string {
  if (process.env.DATABASE_PATH && fs.existsSync(process.env.DATABASE_PATH)) {
    return process.env.DATABASE_PATH;
  }
  if (process.env.MAPPING_DB_PATH && fs.existsSync(process.env.MAPPING_DB_PATH)) {
    return process.env.MAPPING_DB_PATH;
  }

  const candidatePaths = [
    path.join(process.cwd(), 'data', 'treta_railway.db'),
    path.resolve(__dirname, '..', 'data', 'treta_railway.db'),
    path.resolve(__dirname, '..', '..', 'data', 'treta_railway.db'),
    path.resolve(__dirname, 'data', 'treta_railway.db'),
    path.resolve('data', 'treta_railway.db')
  ];

  let foundPath: string | null = null;
  for (const candidate of candidatePaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
      foundPath = candidate;
      break;
    }
  }

  const sourcePath = foundPath || path.join(process.cwd(), 'data', 'treta_railway.db');

  // Vercel / AWS Lambda serverless functions run on a read-only filesystem except /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      const tmpPath = path.join('/tmp', 'treta_railway.db');
      if (!fs.existsSync(tmpPath) && fs.existsSync(/*turbopackIgnore: true*/ sourcePath)) {
        fs.copyFileSync(sourcePath, tmpPath);
      }
      if (fs.existsSync(tmpPath)) {
        return tmpPath;
      }
    } catch (e) {
      console.warn('Could not copy sqlite db to /tmp, falling back to source path:', e);
    }
  }

  return sourcePath;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    const dbPath = resolveDatabasePath();
    try {
      dbInstance = new Database(dbPath, { readonly: false });
    } catch {
      // Fallback to readonly mode if filesystem denies write
      dbInstance = new Database(dbPath, { readonly: true });
    }
    try {
      dbInstance.pragma('foreign_keys = ON');
    } catch {}
  }
  return dbInstance;
}

export * from './types';
import { STATE_COLOR_PALETTES } from './types';
import type {
  Corridor,
  Station,
  Train,
  TrainStop,
  TrainLiveState,
  DelayEvent,
  RouteDivisionItem,
  StateBorderDivisionItem,
  TrackBorderCrossing
} from './types';

export function getAllCorridors(): Corridor[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT c.*, COUNT(t.train_number) as train_count
    FROM corridors c
    LEFT JOIN trains t ON c.id = t.corridor_id
    GROUP BY c.id
    ORDER BY c.id
  `).all() as Corridor[];
}

export function getTrainsByCorridor(corridorId?: string): Train[] {
  const db = getDatabase();
  let query = `
    SELECT 
      t.*,
      s_src.station_name as source_name,
      s_dst.station_name as destination_name,
      c.name as corridor_name
    FROM trains t
    JOIN stations s_src ON t.source_code = s_src.station_code
    JOIN stations s_dst ON t.destination_code = s_dst.station_code
    JOIN corridors c ON t.corridor_id = c.id
  `;
  if (corridorId) {
    query += ` WHERE t.corridor_id = ? ORDER BY t.train_number`;
    return db.prepare(query).all(corridorId) as Train[];
  }
  query += ` ORDER BY t.train_number`;
  return db.prepare(query).all() as Train[];
}

export function getTrainDetails(trainNumber: string): Train | null {
  const db = getDatabase();
  const train = db.prepare(`
    SELECT 
      t.*,
      s_src.station_name as source_name,
      s_dst.station_name as destination_name,
      c.name as corridor_name
    FROM trains t
    JOIN stations s_src ON t.source_code = s_src.station_code
    JOIN stations s_dst ON t.destination_code = s_dst.station_code
    JOIN corridors c ON t.corridor_id = c.id
    WHERE t.train_number = ?
  `).get(trainNumber) as Train | undefined;
  return train || null;
}

export function getTrainRoute(trainNumber: string): { train: Train; stops: TrainStop[] } | null {
  const train = getTrainDetails(trainNumber);
  if (!train) return null;

  const db = getDatabase();
  const stops = db.prepare(`
    SELECT 
      ts.id,
      ts.train_number,
      ts.station_code,
      s.station_name,
      s.latitude,
      s.longitude,
      s.state,
      s.zone,
      s.osm_id,
      s.osm_type,
      ts.stop_sequence,
      ts.scheduled_arrival,
      ts.scheduled_departure,
      ts.distance_km,
      ts.day_number,
      ts.platform,
      COALESCE(ts.halt_minutes, 2) as halt_minutes,
      COALESCE(ep.predicted_eta, ts.scheduled_arrival) as predicted_eta,
      COALESCE(ep.delay_minutes, 0) as delay_minutes,
      COALESCE(ep.cause_type, 'ON_TIME') as cause_type,
      COALESCE(ep.confidence, 0.92) as confidence
    FROM train_stops ts
    JOIN stations s ON ts.station_code = s.station_code
    LEFT JOIN eta_predictions ep ON ts.train_number = ep.train_number AND ts.station_code = ep.station_code
    WHERE ts.train_number = ?
    ORDER BY ts.stop_sequence ASC
  `).all(trainNumber) as TrainStop[];

  return { train, stops };
}

export function getTrainLiveState(trainNumber: string): TrainLiveState | null {
  const db = getDatabase();
  const state = db.prepare(`
    SELECT 
      ls.*,
      s_curr.station_name as current_station_name,
      s_next.station_name as next_station_name
    FROM train_live_state ls
    LEFT JOIN stations s_curr ON ls.current_station_code = s_curr.station_code
    LEFT JOIN stations s_next ON ls.next_station_code = s_next.station_code
    WHERE ls.train_number = ?
  `).get(trainNumber) as TrainLiveState | undefined;
  return state || null;
}

export function updateTrainLiveTelemetry(
  trainNumber: string,
  update: Partial<TrainLiveState>
): void {
  const db = getDatabase();
  const current = getTrainLiveState(trainNumber);
  if (!current) return;

  const lat = update.latitude ?? current.latitude;
  const lng = update.longitude ?? current.longitude;
  const currStn = update.current_station_code ?? current.current_station_code;
  const nextStn = update.next_station_code ?? current.next_station_code;
  const delay = update.delay_minutes ?? current.delay_minutes;
  const reason = update.delay_reason ?? current.delay_reason;
  const eta = update.predicted_eta ?? current.predicted_eta;
  const speed = update.speed_kmh ?? current.speed_kmh;
  const progress = update.progress_percent ?? current.progress_percent;
  const status = update.status ?? current.status;
  const bearing = update.bearing ?? current.bearing;

  db.prepare(`
    UPDATE train_live_state
    SET latitude = ?, longitude = ?, current_station_code = ?, next_station_code = ?,
        delay_minutes = ?, delay_reason = ?, predicted_eta = ?, speed_kmh = ?,
        progress_percent = ?, status = ?, bearing = ?, updated_at = datetime('now')
    WHERE train_number = ?
  `).run(lat, lng, currStn, nextStn, delay, reason, eta, speed, progress, status, bearing, trainNumber);
}

export function getDelayEvents(trainNumber: string): DelayEvent[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT 
      de.*,
      s.station_name
    FROM delay_events de
    JOIN stations s ON de.station_code = s.station_code
    WHERE de.train_number = ?
    ORDER BY de.id DESC
  `).all(trainNumber) as DelayEvent[];
}

export function addDelayEvent(
  trainNumber: string,
  stationCode: string,
  delayMinutes: number,
  causeType: string,
  causeDescription: string,
  confidence: number = 0.91
): DelayEvent {
  const db = getDatabase();
  const res = db.prepare(`
    INSERT INTO delay_events (train_number, station_code, delay_minutes, cause_type, cause_description, confidence)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(trainNumber, stationCode, delayMinutes, causeType, causeDescription, confidence);

  const event = db.prepare(`
    SELECT de.*, s.station_name
    FROM delay_events de
    JOIN stations s ON de.station_code = s.station_code
    WHERE de.id = ?
  `).get(res.lastInsertRowid) as DelayEvent;

  return event;
}

export function updateEtaPredictions(
  trainNumber: string,
  predictions: Array<{
    station_code: string;
    stop_sequence: number;
    scheduled_time: string;
    predicted_eta: string;
    delay_minutes: number;
    cause_type: string;
    confidence: number;
  }>
): void {
  const db = getDatabase();
  const deleteStmt = db.prepare('DELETE FROM eta_predictions WHERE train_number = ?');
  const insertStmt = db.prepare(`
    INSERT INTO eta_predictions (train_number, station_code, stop_sequence, scheduled_time, predicted_eta, delay_minutes, cause_type, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const runTx = db.transaction(() => {
    deleteStmt.run(trainNumber);
    for (const p of predictions) {
      insertStmt.run(trainNumber, p.station_code, p.stop_sequence, p.scheduled_time, p.predicted_eta, p.delay_minutes, p.cause_type, p.confidence);
    }
  });

  runTx();
}

// (RouteDivisionItem, StateBorderDivisionItem, TrackBorderCrossing, and STATE_COLOR_PALETTES are exported from ./types)

export function getRouteDivisionsForTrain(trainNumber: string): RouteDivisionItem[] {
  const db = getDatabase();
  const cleanNumber = trainNumber.trim().replace(/^0+/, '');
  const paddedNumber = cleanNumber.padStart(5, '0');

  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='route_divisions'").get();
  if (!tableCheck) return [];

  const rows = db.prepare(`
    SELECT * FROM route_divisions
    WHERE train_no = ? OR train_no = ?
    ORDER BY CAST(segment_sequence AS INTEGER) ASC
  `).all(cleanNumber, paddedNumber) as RouteDivisionItem[];

  return rows;
}

export function getAllStateBorderDivisions(): StateBorderDivisionItem[] {
  const db = getDatabase();
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='state_border_divisions'").get();
  if (!tableCheck) return [];

  const rows = db.prepare("SELECT * FROM state_border_divisions ORDER BY state_border_key ASC").all() as StateBorderDivisionItem[];
  return rows.map(r => ({
    ...r,
    color: STATE_COLOR_PALETTES[r.state_border_key] || '#94a3b8'
  }));
}

export function getTrackBorderCrossingsForTrain(trainNumber: string, stops: TrainStop[]): TrackBorderCrossing[] {
  const crossings: TrackBorderCrossing[] = [];
  if (!stops || stops.length < 2) return crossings;

  const divisions = getRouteDivisionsForTrain(trainNumber);
  let seq = 1;

  // Track state transitions strictly between consecutive stops along the train's active route
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    const state1 = s1.state?.trim() || '';
    const state2 = s2.state?.trim() || '';

    if (state1 && state2 && state1 !== state2) {
      // Find if route_divisions has an exact division entry between these two states for this train
      const matchedDiv = divisions.find(
        d => (d.from_state === state1 && d.to_state === state2) ||
             (d.from_station_code === s1.station_code && d.to_station_code === s2.station_code)
      );

      const dist1 = s1.distance_km || 0;
      const dist2 = s2.distance_km || (dist1 + 100);
      const approxKm = matchedDiv?.cumulative_distance_km
        ? Math.round(Number(matchedDiv.cumulative_distance_km))
        : Math.round((dist1 + dist2) / 2);

      // Interpolate midpoint coordinates along the segment between s1 and s2
      const borderLat = (s1.latitude + s2.latitude) / 2;
      const borderLng = (s1.longitude + s2.longitude) / 2;

      crossings.push({
        crossing_sequence: seq++,
        from_station_code: s1.station_code,
        from_station_name: s1.station_name,
        to_station_code: s2.station_code,
        to_station_name: s2.station_name,
        from_state: state1,
        from_border_key: `SB-${state1.slice(0, 2).toUpperCase()}`,
        to_state: state2,
        to_border_key: `SB-${state2.slice(0, 2).toUpperCase()}`,
        transition_label: `${state1} -> ${state2}`,
        approx_km: approxKm,
        latitude: borderLat,
        longitude: borderLng
      });
    }
  }

  return crossings;
}
