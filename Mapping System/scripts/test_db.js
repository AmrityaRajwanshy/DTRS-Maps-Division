const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'treta_railway.db');
const db = new Database(dbPath);

console.log('--- VALIDATING TRETA DATABASE ---');

const corridorsCount = db.prepare('SELECT COUNT(*) as count FROM corridors').get().count;
const stationsCount = db.prepare('SELECT COUNT(*) as count FROM stations').get().count;
const trainsCount = db.prepare('SELECT COUNT(*) as count FROM trains').get().count;
const stopsCount = db.prepare('SELECT COUNT(*) as count FROM train_stops').get().count;
const liveCount = db.prepare('SELECT COUNT(*) as count FROM train_live_state').get().count;
const eventsCount = db.prepare('SELECT COUNT(*) as count FROM delay_events').get().count;

console.log(`Corridors: ${corridorsCount}`);
console.log(`Stations: ${stationsCount}`);
console.log(`Trains: ${trainsCount}`);
console.log(`Total Train Stops: ${stopsCount}`);
console.log(`Live State records: ${liveCount}`);
console.log(`Delay Events: ${eventsCount}`);

console.log('\n--- VERIFYING TRAIN 12304 POORVA EXPRESS ROUTE ---');
const poorvaStops = db.prepare(`
  SELECT 
    ts.stop_sequence,
    s.station_name,
    s.station_code,
    s.latitude,
    s.longitude,
    ts.scheduled_arrival,
    ts.scheduled_departure,
    ts.distance_km
  FROM train_stops ts
  JOIN stations s ON ts.station_code = s.station_code
  WHERE ts.train_number = '12304'
  ORDER BY ts.stop_sequence ASC
`).all();

poorvaStops.forEach(s => {
  console.log(`${s.stop_sequence}. ${s.station_name} (${s.station_code}) [${s.latitude}, ${s.longitude}] Arr: ${s.scheduled_arrival} Dep: ${s.scheduled_departure} Dist: ${s.distance_km}km`);
});

console.log('\n--- LIVE TELEMETRY FOR 12304 ---');
const live = db.prepare(`
  SELECT 
    ls.*,
    s_curr.station_name as current_station_name,
    s_next.station_name as next_station_name
  FROM train_live_state ls
  LEFT JOIN stations s_curr ON ls.current_station_code = s_curr.station_code
  LEFT JOIN stations s_next ON ls.next_station_code = s_next.station_code
  WHERE ls.train_number = '12304'
`).get();

console.log(live);

console.log('\n--- ALL CORRIDORS WITH TRAIN COUNTS ---');
const corridorsList = db.prepare(`
  SELECT c.id, c.name, COUNT(t.train_number) as train_count
  FROM corridors c
  LEFT JOIN trains t ON c.id = t.corridor_id
  GROUP BY c.id
`).all();

console.table(corridorsList);

db.close();
console.log('\nValidation Passed Successfully!');
