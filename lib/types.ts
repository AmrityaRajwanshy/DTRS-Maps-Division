// -----------------------------------------------------------------------------
// DTRS MAPPING SYSTEM — CLIENT-SAFE TYPES & SHARED CONSTANTS
// (Zero Node.js runtime dependencies — safe for Client Components & SSR)
// -----------------------------------------------------------------------------

export interface Corridor {
  id: string;
  name: string;
  description: string;
  origin_city: string;
  destination_city: string;
  train_count?: number;
}

export interface Station {
  station_code: string;
  station_name: string;
  latitude: number;
  longitude: number;
  state: string;
  zone: string;
  osm_id?: string;
  osm_type?: string;
}

export interface Train {
  train_number: string;
  train_name: string;
  corridor_id: string;
  source_code: string;
  destination_code: string;
  duration: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  verification_status: string;
  source_name?: string;
  destination_name?: string;
  corridor_name?: string;
}

export interface TrainStop {
  id: number;
  train_number: string;
  station_code: string;
  station_name: string;
  latitude: number;
  longitude: number;
  state: string;
  zone: string;
  osm_id?: string;
  osm_type?: string;
  stop_sequence: number;
  scheduled_arrival: string;
  scheduled_departure: string;
  distance_km: number;
  day_number: number;
  platform: string;
  halt_minutes?: number;
  predicted_eta?: string;
  delay_minutes?: number;
  cause_type?: string;
  cause_description?: string;
  confidence?: number;
}

export interface TrainLiveState {
  train_number: string;
  latitude: number;
  longitude: number;
  current_station_code: string;
  current_station_name?: string;
  next_station_code: string;
  next_station_name?: string;
  delay_minutes: number;
  delay_reason: string;
  predicted_eta: string;
  speed_kmh: number;
  progress_percent: number;
  status: 'RUNNING' | 'STOPPED_AT_STATION' | 'SPEED_RESTRICTED' | 'SIGNAL_HALT' | 'COMPLETED';
  bearing: number;
  updated_at: string;
}

export interface DelayEvent {
  id: number;
  train_number: string;
  station_code: string;
  station_name?: string;
  delay_minutes: number;
  cause_type: string;
  cause_description: string;
  confidence: number;
  event_time: string;
}

export interface RouteDivisionItem {
  id?: number;
  corridor: string;
  corridor_slug: string;
  train_no: string;
  train_name: string;
  train_tier: string;
  segment_sequence: number;
  treta_segment_number: string;
  from_station_code: string;
  from_station_name: string;
  from_state: string;
  from_state_code: string;
  from_state_border_key: string;
  to_station_code: string;
  to_station_name: string;
  to_state: string;
  to_state_code: string;
  to_state_border_key: string;
  is_border_crossing: number;
  state_border_transition: string;
  state_border_key: string;
  segment_type: string;
  dep_time: string;
  arr_time: string;
  segment_distance_km: number;
  cumulative_distance_km: number;
  day: number;
}

export interface StateBorderDivisionItem {
  state_border_key: string;
  state_name: string;
  state_code: string;
  total_stations_clubbed: number | string;
  corridor_stations_count: number | string;
  total_halt_events: number | string;
  primary_railway_zones: string;
  major_junctions: string;
  corridor_stations_list?: string;
  color?: string;
}

export interface TrackBorderCrossing {
  crossing_sequence: number;
  from_station_code: string;
  from_station_name: string;
  to_station_code: string;
  to_station_name: string;
  from_state: string;
  from_border_key: string;
  to_state: string;
  to_border_key: string;
  transition_label: string;
  approx_km: number;
  latitude: number;
  longitude: number;
}

export const STATE_COLOR_PALETTES: Record<string, string> = {
  'SB-DL': '#00e5ff', // Delhi (Electric Cyan)
  'SB-UP': '#f59e0b', // Uttar Pradesh (Vibrant Amber / Gold)
  'SB-BR': '#10b981', // Bihar (Rich Emerald Green)
  'SB-JH': '#a855f7', // Jharkhand (Bright Purple / Violet)
  'SB-WB': '#ec4899', // West Bengal (Hot Pink / Magenta)
  'SB-RJ': '#f97316', // Rajasthan (Sunset Orange)
  'SB-GJ': '#06b6d4', // Gujarat (Cyan Teal)
  'SB-MH': '#6366f1', // Maharashtra (Royal Indigo)
  'SB-MP': '#84cc16', // Madhya Pradesh (Vivid Lime)
  'SB-AP': '#eab308', // Andhra Pradesh (Sun Yellow)
  'SB-TS': '#3b82f6', // Telangana (Royal Blue)
  'SB-TN': '#14b8a6', // Tamil Nadu (Teal Mint)
  'SB-KA': '#d946ef', // Karnataka (Neon Fuchsia)
  'SB-OD': '#059669', // Odisha (Forest Green)
  'SB-OR': '#059669', // Odisha
  'SB-AS': '#22c55e', // Assam (Spring Green)
  'SB-CG': '#ef4444', // Chhattisgarh (Vivid Crimson)
  'SB-HR': '#0284c7', // Haryana (Deep Azure)
  'SB-PB': '#f43f5e', // Punjab (Rose)
  'SB-KL': '#10b981', // Kerala (Emerald)
  'SB-UK': '#8b5cf6', // Uttarakhand (Violet)
  'SB-HP': '#06b6d4', // Himachal (Ice Cyan)
  'SB-JK': '#38bdf8', // Jammu & Kashmir (Glacier Blue)
  'SB-GA': '#e11d48', // Goa (Ruby)
};

export const STATE_NAME_TO_KEY: Record<string, string> = {
  'delhi': 'SB-DL',
  'uttar pradesh': 'SB-UP',
  'bihar': 'SB-BR',
  'jharkhand': 'SB-JH',
  'west bengal': 'SB-WB',
  'rajasthan': 'SB-RJ',
  'gujarat': 'SB-GJ',
  'maharashtra': 'SB-MH',
  'madhya pradesh': 'SB-MP',
  'andhra pradesh': 'SB-AP',
  'telangana': 'SB-TS',
  'tamil nadu': 'SB-TN',
  'karnataka': 'SB-KA',
  'odisha': 'SB-OD',
  'orissa': 'SB-OD',
  'assam': 'SB-AS',
  'chhattisgarh': 'SB-CG',
  'haryana': 'SB-HR',
  'punjab': 'SB-PB',
  'kerala': 'SB-KL',
  'uttarakhand': 'SB-UK',
  'himachal pradesh': 'SB-HP',
  'jammu and kashmir': 'SB-JK',
  'goa': 'SB-GA'
};

export function getStateBorderKey(stateNameOrKey: string): string {
  if (!stateNameOrKey) return 'SB-DL';
  const clean = stateNameOrKey.trim();
  if (clean.startsWith('SB-')) return clean.toUpperCase();
  const lower = clean.toLowerCase();
  if (STATE_NAME_TO_KEY[lower]) return STATE_NAME_TO_KEY[lower];
  const codeKey = `SB-${clean.toUpperCase().slice(0, 2)}`;
  if (STATE_COLOR_PALETTES[codeKey]) return codeKey;
  return 'SB-DL';
}

export function getStateColor(stateNameOrKey: string): string {
  const key = getStateBorderKey(stateNameOrKey);
  return STATE_COLOR_PALETTES[key] || '#f59e0b';
}

export interface LiveRailRadarTelemetry {
  trainNumber: string;
  trainName: string;
  isLive: boolean;
  source: 'upstream_railradar_api' | 'cached_telemetry';
  status: 'RUNNING' | 'STOPPED_AT_STATION' | 'SPEED_RESTRICTED' | 'SIGNAL_HALT' | 'COMPLETED' | 'NO_LIVE_DATA';
  latitude: number;
  longitude: number;
  bearing: number;
  speed_kmh: number;
  delay_minutes: number;
  progress_percent: number;
  distance_from_origin_km: number;
  current_station_code: string;
  current_station_name: string;
  next_station_code: string;
  next_station_name: string;
  last_updated_at: string;
  active_state: string;
  active_state_border_key: string;
  active_division_segment_id: string;
  raw?: any;
}

export interface ETAPredictionResult {
  station_code: string;
  station_name: string;
  stop_sequence: number;
  scheduled_time: string;
  predicted_eta: string;
  delay_minutes: number;
  delay_delta_minutes: number;
  cause_type: string;
  cause_description: string;
  confidence: number;
  recovery_buffer_minutes: number;
  is_delayed: boolean;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
}

export interface DelayAttributionSummary {
  train_number: string;
  total_delay_minutes: number;
  primary_cause_station: string;
  primary_cause_type: string;
  primary_cause_description: string;
  confidence: number;
  stations_affected: number;
  recovered_minutes: number;
  net_destination_delay_minutes: number;
  recommendation: string;
  breakdown: Array<{
    station_code: string;
    station_name: string;
    delay_added: number;
    delay_absorbed: number;
    cumulative_delay: number;
    reason: string;
  }>;
}

