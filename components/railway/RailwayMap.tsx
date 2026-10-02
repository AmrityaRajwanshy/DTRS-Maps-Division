'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  TrainStop,
  TrackBorderCrossing,
  RouteDivisionItem,
  LiveRailRadarTelemetry
} from '@/lib/types';
import { STATE_COLOR_PALETTES, getStateColor, getStateBorderKey } from '@/lib/types';
import { SimulationState } from '@/lib/simulation';
import { generateCurvedTrackBetween, getCurvedRailwayPolyline, DEFAULT_TRACK_SEGMENTS } from '@/lib/trackGeometry';


export interface RailwayMapProps {
  stops: TrainStop[];
  trainNumber: string;
  trainName: string;
  simulationState: SimulationState | null;
  isSimulating: boolean;
  onSelectStation?: (stationCode: string) => void;
  selectedStationCode?: string | null;
  // Live GPS & Track Divisions Props
  liveRailRadarData?: LiveRailRadarTelemetry | null;
  isLiveGpsMode?: boolean;
  onToggleLiveGpsMode?: () => void;
  stateCrossings?: TrackBorderCrossing[];
  routeDivisions?: RouteDivisionItem[];
  allTrainsLive?: LiveRailRadarTelemetry[];
  // Full canvas props
  isFullCanvas?: boolean;
  onToggleFullCanvas?: () => void;
  // Website Canvas External Control Props
  showTrainRoute?: boolean;
  onToggleShowTrainRoute?: () => void;
  isFollowingTrain?: boolean;
  onToggleFollowTrain?: () => void;
  showStateDivisions?: boolean;
  onToggleShowStateDivisions?: () => void;
  showStationDivisions?: boolean;
  onToggleShowStationDivisions?: () => void;
  showAllTrainsFleet?: boolean;
  onToggleShowAllTrainsFleet?: () => void;
  fitRouteTrigger?: number;
}

export const RailwayMap: React.FC<RailwayMapProps> = ({
  stops,
  trainNumber,
  trainName,
  simulationState,
  isSimulating,
  onSelectStation,
  selectedStationCode,
  liveRailRadarData,
  isLiveGpsMode = false,
  onToggleLiveGpsMode,
  stateCrossings = [],
  routeDivisions = [],
  allTrainsLive = [],
  isFullCanvas = false,
  onToggleFullCanvas,
  showTrainRoute: propShowTrainRoute,
  onToggleShowTrainRoute,
  isFollowingTrain: propIsFollowingTrain,
  onToggleFollowTrain,
  showStateDivisions: propShowStateDivisions,
  onToggleShowStateDivisions,
  showStationDivisions: propShowStationDivisions,
  onToggleShowStationDivisions,
  showAllTrainsFleet: propShowAllTrainsFleet,
  onToggleShowAllTrainsFleet,
  fitRouteTrigger
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const glowPolylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const statePolylinesRef = useRef<L.Polyline[]>([]);
  const stateMarkersRef = useRef<L.Marker[]>([]);
  const blockPolylinesRef = useRef<L.Polyline[]>([]);
  const blockMarkersRef = useRef<L.Marker[]>([]);
  const fleetMarkersRef = useRef<L.Marker[]>([]);
  const trainMarkerRef = useRef<L.Marker | null>(null);

  const [osmTrackPoints, setOsmTrackPoints] = useState<[number, number][]>([]);
  const [internalIsFollowingTrain, setInternalIsFollowingTrain] = useState<boolean>(false);
  const isFollowingTrain = propIsFollowingTrain !== undefined ? propIsFollowingTrain : internalIsFollowingTrain;
  const setIsFollowingTrain = (val: boolean) => {
    if (onToggleFollowTrain) onToggleFollowTrain();
    else setInternalIsFollowingTrain(val);
  };

  // Layer Toggles with controlled or internal fallback
  const [internalShowTrainRoute, setInternalShowTrainRoute] = useState<boolean>(true);
  const showTrainRoute = propShowTrainRoute !== undefined ? propShowTrainRoute : internalShowTrainRoute;
  const setShowTrainRoute = (val: boolean) => {
    if (onToggleShowTrainRoute) onToggleShowTrainRoute();
    else setInternalShowTrainRoute(val);
  };

  const [internalShowStateDivisions, setInternalShowStateDivisions] = useState<boolean>(true);
  const showStateDivisions = propShowStateDivisions !== undefined ? propShowStateDivisions : internalShowStateDivisions;

  const [internalShowStationDivisions, setInternalShowStationDivisions] = useState<boolean>(true);
  const showStationDivisions = propShowStationDivisions !== undefined ? propShowStationDivisions : internalShowStationDivisions;

  const [internalShowAllTrainsFleet, setInternalShowAllTrainsFleet] = useState<boolean>(false);
  const showAllTrainsFleet = propShowAllTrainsFleet !== undefined ? propShowAllTrainsFleet : internalShowAllTrainsFleet;

  // Automatically enable train route when train selection changes
  useEffect(() => {
    if (trainNumber) {
      if (onToggleShowTrainRoute) {
        // keep external state synchronized
      } else {
        setInternalShowTrainRoute(true);
      }
    }
  }, [trainNumber, onToggleShowTrainRoute]);

  // Unique States on Route for Dynamic Territory Legend
  const uniqueStatesOnRoute = React.useMemo(() => {
    if (!stops || stops.length === 0) return [];
    const seen = new Set<string>();
    const list: { state: string; key: string; color: string }[] = [];
    for (const stop of stops) {
      const st = stop.state || 'Territory';
      if (!seen.has(st)) {
        seen.add(st);
        list.push({
          state: st,
          key: getStateBorderKey(st),
          color: getStateColor(st)
        });
      }
    }
    return list;
  }, [stops]);

  // 1. Initialize Map with exclusive OpenStreetMap raster layer
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([24.0, 82.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (trainMarkerRef.current) {
        try { map.removeLayer(trainMarkerRef.current); } catch (_) {}
        trainMarkerRef.current = null;
      }
      statePolylinesRef.current.forEach(p => { try { map.removeLayer(p); } catch (_) {} });
      statePolylinesRef.current = [];
      stateMarkersRef.current.forEach(m => { try { map.removeLayer(m); } catch (_) {} });
      stateMarkersRef.current = [];
      blockPolylinesRef.current.forEach(p => { try { map.removeLayer(p); } catch (_) {} });
      blockPolylinesRef.current = [];
      blockMarkersRef.current.forEach(m => { try { map.removeLayer(m); } catch (_) {} });
      blockMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Fetch high-precision OSM railway track geometry for current train
  useEffect(() => {
    if (!trainNumber) return;

    if (trainMarkerRef.current && mapRef.current) {
      try { mapRef.current.removeLayer(trainMarkerRef.current); } catch (_) {}
      trainMarkerRef.current = null;
    }

    let isMounted = true;
    async function loadTracks() {
      try {
        const res = await fetch(`/api/osm/tracks?train=${trainNumber}`);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.coordinates)) {
          setOsmTrackPoints(data.coordinates);
        }
      } catch (err) {
        console.warn('Could not load high-fidelity OSM tracks, using stop coordinates fallback:', err);
      }
    }
    loadTracks();

    return () => {
      isMounted = false;
    };
  }, [trainNumber]);

  // 3. Render Route Polyline and Station Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      try { map.removeLayer(routePolylineRef.current); } catch (_) {}
      routePolylineRef.current = null;
    }
    if (glowPolylineRef.current) {
      try { map.removeLayer(glowPolylineRef.current); } catch (_) {}
      glowPolylineRef.current = null;
    }
    markersRef.current.forEach(m => {
      try { map.removeLayer(m); } catch (_) {}
    });
    markersRef.current = [];

    if (!stops || stops.length === 0) return;

    // Draw Train Route Polyline only if showTrainRoute is enabled
    if (showTrainRoute) {
      const polylineCoords: L.LatLngExpression[] =
        osmTrackPoints.length > 0
          ? osmTrackPoints
          : getCurvedRailwayPolyline(stops);

      // Sleek dark slate / deep navy railway track bed underneath
      const trackBed = L.polyline(polylineCoords, {
        color: '#1e293b',
        weight: 7,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      glowPolylineRef.current = trackBed;

      // Neutral baseline centerline if state division layer is toggled off
      if (!showStateDivisions) {
        const line = L.polyline(polylineCoords, {
          color: '#94a3b8',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '7, 6'
        }).addTo(map);
        routePolylineRef.current = line;
      }
    }

    // Station Markers: Remain on the map independently
    stops.forEach((stop, index) => {
      const stationCode = stop.station_code || (stop as any).code || '';
      const stationName = stop.station_name || (stop as any).station || '';
      const sequence = stop.stop_sequence ?? (stop as any).sequence ?? (index + 1);

      const isSource = index === 0;
      const isDestination = index === stops.length - 1;
      const delay = stop.delay_minutes || 0;
      const isMajorDelay = delay > 15;
      const isModerateDelay = delay > 0 && delay <= 15;
      const stateName = stop.state || 'Territory';
      const borderKey = getStateBorderKey(stateName);
      const stateColor = getStateColor(stateName);

      let markerHtml = '';
      if (isSource) {
        markerHtml = `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>
            <div class="w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-[10px]">
              S
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap bg-white/95 text-emerald-700 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-300 shadow-md">
              ${stationCode}
            </div>
          </div>
        `;
      } else if (isDestination) {
        markerHtml = `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-9 h-9 rounded-full bg-rose-500/30 animate-ping"></div>
            <div class="w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs leading-none">
              ◎
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap bg-white/95 text-rose-700 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-300 shadow-md">
              ${stationCode}
            </div>
          </div>
        `;
      } else if (isMajorDelay) {
        markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="absolute w-7 h-7 rounded-full bg-rose-500/40 animate-ping"></div>
            <div class="w-5 h-5 rounded-full bg-rose-600 border-2 border-rose-200 shadow-xl group-hover:scale-125 transition-transform flex items-center justify-center text-[10px] font-black text-white">
              !!
            </div>
            <div class="absolute -top-3 -right-2 bg-rose-100 text-rose-800 font-mono text-[8px] font-bold px-1 rounded border border-rose-300 shadow">
              +${delay}m
            </div>
            <div class="absolute -bottom-4 whitespace-nowrap bg-white/95 text-rose-700 font-mono text-[9px] font-bold px-1 py-0.2 rounded border border-rose-300 shadow">
              ${stationCode}
            </div>
          </div>
        `;
      } else if (isModerateDelay) {
        markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow-lg group-hover:scale-125 transition-transform flex items-center justify-center text-[10px] font-black text-white">
              !
            </div>
            <div class="absolute -top-3 -right-2 bg-amber-100 text-amber-800 font-mono text-[8px] font-bold px-1 rounded border border-amber-300 shadow">
              +${delay}m
            </div>
            <div class="absolute -bottom-4 whitespace-nowrap bg-white/95 text-amber-800 font-mono text-[9px] font-bold px-1 py-0.2 rounded border border-amber-300 shadow">
              ${stationCode}
            </div>
          </div>
        `;
      } else {
        markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-3.5 h-3.5 rounded-full bg-[#172b54] border-2 border-white shadow-md group-hover:scale-125 transition-transform flex items-center justify-center text-[8px] font-bold text-white">
              •
            </div>
            <div class="absolute -bottom-4 whitespace-nowrap bg-white/95 text-[#172b54] font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border border-slate-300 shadow-sm">
              ${stationCode}
            </div>
          </div>
        `;
      }

      const icon = L.divIcon({
        className: 'station-div-icon',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon }).addTo(map);

      const etaText = stop.predicted_eta || stop.scheduled_arrival || '--:--';
      const tooltipContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 175px;">
          <div style="font-weight: 800; font-size: 13px; color: #172b54; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 5px;">
            <span>${stationName}</span>
            <span style="font-size: 10px; font-family: monospace; color: #172b54; background: #e8eef8; padding: 1px 5px; border-radius: 4px; border: 1px solid #cbd9ee;">${stationCode}</span>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color: #64748b;">State Division:</span>
            <strong style="color: ${stateColor}; font-family: monospace;">${stateName} (${borderKey})</strong>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Platform:</span>
            <strong style="color: #0f172a; font-family: monospace;">PF #${stop.platform || 1}</strong>
          </div>
          <div style="font-size: 11px; display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 3px;">
            <span style="color: #64748b;">ETA:</span>
            <strong style="color: #ea580c; font-family: monospace;">${etaText}</strong>
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -14],
        className: 'station-hover-tooltip',
        opacity: 1
      });

      marker.on('click', () => {
        if (onSelectStation) {
          onSelectStation(stop.station_code);
        }
      });

      markersRef.current.push(marker);
    });
  }, [stops, osmTrackPoints, showStateDivisions, onSelectStation, showTrainRoute]);

  // 4A. Render State Territorial Divisions & Cross-Border Transitions
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up previous state division layers
    statePolylinesRef.current.forEach(p => {
      try { map.removeLayer(p); } catch (_) {}
    });
    statePolylinesRef.current = [];
    stateMarkersRef.current.forEach(m => {
      try { map.removeLayer(m); } catch (_) {}
    });
    stateMarkersRef.current = [];

    if (!showStateDivisions || !stops || stops.length < 2) return;

    // Draw each inter-station track section in that state's distinct, vibrant color
    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = stops[i];
      const s2 = stops[i + 1];
      const state1 = s1.state || 'Territory';
      const state2 = s2.state || 'Territory';
      const color1 = getStateColor(state1);
      const color2 = getStateColor(state2);
      const key1 = getStateBorderKey(state1);
      const key2 = getStateBorderKey(state2);
      const isBorderCrossing = state1 !== state2;

      if (!isBorderCrossing) {
        // Regular internal state railway track segment
        const curvedCoords = generateCurvedTrackBetween(
          [s1.latitude, s1.longitude],
          [s2.latitude, s2.longitude],
          DEFAULT_TRACK_SEGMENTS
        );

        // Outer ambient state color glow
        const glow = L.polyline(curvedCoords, {
          color: color1,
          weight: 9,
          opacity: 0.4,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        // Vibrant core railway line
        const line = L.polyline(curvedCoords, {
          color: color1,
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        // Inner railroad ties / track dash
        const ties = L.polyline(curvedCoords, {
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.65,
          dashArray: '5, 8'
        }).addTo(map);

        line.bindTooltip(
          `<div style="font-family: monospace; font-size: 11px; padding: 2px;">
            <b style="color: ${color1}; font-size: 12px;">State Territory: ${state1} (${key1})</b><br/>
            <span style="color: #cbd5e1;">Section: ${s1.station_name} to ${s2.station_name} (${Math.round((s2.distance_km || 0) - (s1.distance_km || 0))} km)</span>
          </div>`,
          { sticky: true, className: 'station-hover-tooltip' }
        );

        statePolylinesRef.current.push(glow, line, ties);
      } else {
        // INTER-STATE BORDER CROSSING SECTION:
        const matchedCross = stateCrossings.find(
          c => (c.from_station_code === s1.station_code && c.to_station_code === s2.station_code) ||
               (c.from_state === state1 && c.to_state === state2)
        );

        const borderLat = matchedCross?.latitude || (s1.latitude + s2.latitude) / 2;
        const borderLng = matchedCross?.longitude || (s1.longitude + s2.longitude) / 2;
        const borderPt: [number, number] = [borderLat, borderLng];
        const approxKm = matchedCross?.approx_km || Math.round(((s1.distance_km || 0) + (s2.distance_km || 0)) / 2);

        // Sub-track 1: s1 -> border (State 1 color)
        const subCoords1 = generateCurvedTrackBetween([s1.latitude, s1.longitude], borderPt, 4);
        const glow1 = L.polyline(subCoords1, {
          color: color1,
          weight: 9,
          opacity: 0.4,
          lineCap: 'round'
        }).addTo(map);

        const line1 = L.polyline(subCoords1, {
          color: color1,
          weight: 5,
          opacity: 0.95
        }).addTo(map);

        const ties1 = L.polyline(subCoords1, {
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.65,
          dashArray: '5, 8'
        }).addTo(map);

        line1.bindTooltip(
          `<div style="font-family: monospace; font-size: 11px;">
            <b style="color: ${color1}; font-size: 12px;">State Territory: ${state1} (${key1})</b><br/>
            <span style="color: #cbd5e1;">Approaching Inter-State Border to ${state2}</span>
          </div>`,
          { sticky: true, className: 'station-hover-tooltip' }
        );

        // Sub-track 2: border -> s2 (State 2 color)
        const subCoords2 = generateCurvedTrackBetween(borderPt, [s2.latitude, s2.longitude], 4);
        const glow2 = L.polyline(subCoords2, {
          color: color2,
          weight: 9,
          opacity: 0.4,
          lineCap: 'round'
        }).addTo(map);

        const line2 = L.polyline(subCoords2, {
          color: color2,
          weight: 5,
          opacity: 0.95
        }).addTo(map);

        const ties2 = L.polyline(subCoords2, {
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.65,
          dashArray: '5, 8'
        }).addTo(map);

        line2.bindTooltip(
          `<div style="font-family: monospace; font-size: 11px;">
            <b style="color: ${color2}; font-size: 12px;">State Territory: ${state2} (${key2})</b><br/>
            <span style="color: #cbd5e1;">Entered from ${state1} towards ${s2.station_name}</span>
          </div>`,
          { sticky: true, className: 'station-hover-tooltip' }
        );

        statePolylinesRef.current.push(glow1, line1, ties1, glow2, line2, ties2);

        // PROMINENT PURPLE INTER-STATE TRANSITION ON ROUTE
        const trackNodeIcon = L.divIcon({
          className: 'interstate-transition-node',
          html: `
            <div class="relative flex items-center justify-center pointer-events-auto">
              <div class="w-7 h-7 rounded-full bg-purple-500/35 animate-ping absolute"></div>
              <div class="w-5 h-5 rounded-full bg-purple-600 border-2 border-white shadow-xl flex items-center justify-center ring-2 ring-purple-400">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        const trackNode = L.marker(borderPt, { icon: trackNodeIcon, zIndexOffset: 1550 }).addTo(map);
        stateMarkersRef.current.push(trackNode);

        // Perpendicular state border division line drawn across the track in PURPLE
        const dLat = s2.latitude - s1.latitude;
        const dLng = s2.longitude - s1.longitude;
        const len = Math.hypot(dLat, dLng) || 0.01;
        const pLat = -dLng / len;
        const pLng = dLat / len;
        const span = 0.16; // spans ~16km across the track

        const borderP1: [number, number] = [borderLat - pLat * span, borderLng - pLng * span];
        const borderP2: [number, number] = [borderLat + pLat * span, borderLng + pLng * span];

        // Vibrant Purple Border Barrier Crossing Line
        const borderGlowLine = L.polyline([borderP1, borderP2], {
          color: '#9333ea',
          weight: 14,
          opacity: 0.55,
          lineCap: 'round'
        }).addTo(map);

        const borderDashLine = L.polyline([borderP1, borderP2], {
          color: '#ffffff',
          weight: 4.5,
          opacity: 0.98,
          dashArray: '8, 6',
          lineCap: 'round'
        }).addTo(map);

        borderDashLine.bindTooltip(
          `<div style="font-family: monospace; font-size: 11px; font-weight: bold; text-align: center;">
            <span style="color: #9333ea; font-size: 12px;">INTER-STATE TRANSITION</span><br/>
            <span style="color: ${color1}; font-weight: bold;">${state1} (${key1})</span>
            <span style="color: #9333ea; margin: 0 4px;">to</span>
            <span style="color: ${color2}; font-weight: bold;">${state2} (${key2})</span>
          </div>`,
          { sticky: true, className: 'station-hover-tooltip' }
        );

        statePolylinesRef.current.push(borderGlowLine, borderDashLine);

        // Border Boundary Pillar Posts in Purple
        [borderP1, borderP2].forEach((postPt, pIdx) => {
          const postIcon = L.divIcon({
            className: 'border-pillar-post',
            html: `
              <div class="relative flex items-center justify-center">
                <div class="w-4 h-4 rounded-full bg-purple-600 border-2 border-white shadow-xl flex items-center justify-center ring-2 ring-purple-300">
                  <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
              </div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          const postMarker = L.marker(postPt, { icon: postIcon }).addTo(map);
          postMarker.bindTooltip(
            `<div style="font-family: monospace; font-size: 10px; color: #9333ea; font-weight: bold;">State Transition Pillar ${pIdx === 0 ? 'Left' : 'Right'}</div>`,
            { className: 'station-hover-tooltip' }
          );
          stateMarkersRef.current.push(postMarker);
        });

        // Purple Inter-State Transition Checkpoint Badge at the Center Crossing Point
        const crossHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group select-none">
            <div class="absolute w-12 h-12 rounded-full bg-purple-500/35 animate-ping"></div>
            <div class="relative px-3 py-1 rounded-full bg-white/98 border-2 border-purple-600 shadow-xl flex items-center gap-1.5 font-mono text-[9px] font-black tracking-wide group-hover:scale-115 transition-transform text-slate-900 whitespace-nowrap">
              <span style="color: ${color1}; font-weight: 800;">● ${key1.replace('SB-', '')}</span>
              <span class="bg-purple-100 text-purple-900 text-[8px] font-black px-1.5 py-0.5 rounded border border-purple-300 uppercase tracking-wide whitespace-nowrap">TRANSITION to</span>
              <span style="color: ${color2}; font-weight: 800;">● ${key2.replace('SB-', '')}</span>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap bg-purple-50 text-purple-900 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded border border-purple-300 shadow-sm">
              ~${approxKm} km
            </div>
          </div>
        `;

        const crossIcon = L.divIcon({
          className: 'state-border-marker',
          html: crossHtml,
          iconSize: [160, 30],
          iconAnchor: [80, 15]
        });

        const crossMarker = L.marker([borderLat, borderLng], { icon: crossIcon, zIndexOffset: 1600 }).addTo(map);

        crossMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 260px; padding: 10px; color: #0f172a;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 13px; color: #7e22ce; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px;">
              <span>INTER-STATE TRANSITION</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; background: #fdf4ff; padding: 6px 8px; border-radius: 6px; border: 1px solid #f0abfc;">
              <span style="color: ${color1}; font-weight: bold; font-size: 12px;">${state1} (${key1})</span>
              <span style="color: #7e22ce; font-weight: bold; font-size: 11px;">TRANSITION to</span>
              <span style="color: ${color2}; font-weight: bold; font-size: 12px;">${state2} (${key2})</span>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              Section: <b style="color: #0f172a;">${s1.station_name} to ${s2.station_name}</b>
            </div>
            <div style="font-size: 10px; font-family: monospace; color: #7e22ce; border-top: 1px dashed #e9d5ff; padding-top: 5px; margin-top: 6px; font-weight: bold;">
              Milestone: ~${approxKm} KM from Origin Station
            </div>
          </div>
        `, { maxWidth: 300 });

        stateMarkersRef.current.push(crossMarker);
      }
    }
  }, [stops, showStateDivisions, stateCrossings]);

  // 4B. Render Station-to-Station Block Divisions (TRETA TS Segments)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up previous block division layers
    blockPolylinesRef.current.forEach(p => {
      try { map.removeLayer(p); } catch (_) {}
    });
    blockPolylinesRef.current = [];
    blockMarkersRef.current.forEach(m => {
      try { map.removeLayer(m); } catch (_) {}
    });
    blockMarkersRef.current = [];

    if (!showStationDivisions || !stops || stops.length < 2) return;

    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = stops[i];
      const s2 = stops[i + 1];
      const midLat = (s1.latitude + s2.latitude) / 2;
      const midLng = (s1.longitude + s2.longitude) / 2;
      const segDist = Math.max(0, (s2.distance_km || 0) - (s1.distance_km || 0));

      const matchedDiv = routeDivisions.find(
        d => d.from_station_code === s1.station_code && d.to_station_code === s2.station_code
      );
      const segmentId = matchedDiv?.treta_segment_number || `TS-${i + 1}`;

      // Check if train is currently inside this block segment
      const isActiveSegment =
        (liveRailRadarData && liveRailRadarData.current_station_code === s1.station_code) ||
        (simulationState && simulationState.current_station.code === s1.station_code);

      // Draw subtle block boundary delimiter tick mark across the track
      const dLat = s2.latitude - s1.latitude;
      const dLng = s2.longitude - s1.longitude;
      const len = Math.hypot(dLat, dLng) || 0.01;
      const pLat = -dLng / len;
      const pLng = dLat / len;
      const tickSpan = 0.05; // ~5km delimiter tick

      const tickP1: [number, number] = [midLat - pLat * tickSpan, midLng - pLng * tickSpan];
      const tickP2: [number, number] = [midLat + pLat * tickSpan, midLng + pLng * tickSpan];

      const blockTick = L.polyline([tickP1, tickP2], {
        color: isActiveSegment ? '#0284c7' : '#64748b',
        weight: isActiveSegment ? 3.5 : 2.5,
        opacity: 0.85,
        lineCap: 'square'
      }).addTo(map);

      blockPolylinesRef.current.push(blockTick);

      const segHtml = `
        <div class="relative flex items-center justify-center pointer-events-auto cursor-pointer group">
          ${isActiveSegment ? '<div class="absolute -inset-1 rounded-lg bg-sky-500/40 animate-pulse"></div>' : ''}
          <div class="whitespace-nowrap px-2 py-0.5 rounded font-mono text-[9px] font-bold border shadow-md transition-all group-hover:scale-110 ${
            isActiveSegment
              ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-300 shadow-sky-500/30'
              : 'bg-white/95 text-slate-800 border-slate-300 hover:border-indigo-500 hover:text-indigo-900'
          }">
            <span class="${isActiveSegment ? 'text-sky-200' : 'text-indigo-600'} font-black mr-1">❖</span>
            ${segmentId} • ${segDist}km
          </div>
        </div>
      `;

      const segIcon = L.divIcon({
        className: 'block-division-chip',
        html: segHtml,
        iconSize: [85, 20],
        iconAnchor: [42, 10]
      });

      const segMarker = L.marker([midLat, midLng], { icon: segIcon, zIndexOffset: 1200 }).addTo(map);

      segMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 6px; color: #0f172a;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            <b style="color: #4f46e5; font-size: 13px;">Block Section: ${segmentId}</b>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; ${isActiveSegment ? 'background: #0284c7; color: white;' : 'background: #f1f5f9; color: #475569;'}">
              ${isActiveSegment ? 'OCCUPIED' : 'CLEAR'}
            </span>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px;">
            <span style="color: #64748b;">From:</span> <b>${s1.station_name} (${s1.station_code})</b>
          </div>
          <div style="font-size: 11px; margin-bottom: 3px;">
            <span style="color: #64748b;">To:</span> <b>${s2.station_name} (${s2.station_code})</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: monospace; background: #f8fafc; padding: 4px 6px; border-radius: 4px; margin-top: 6px; border: 1px solid #e2e8f0;">
            <span>Block Distance: <b>${segDist} km</b></span>
            <span>State: <b>${s1.state || 'Territory'}</b></span>
          </div>
        </div>
      `, { maxWidth: 260 });

      blockMarkersRef.current.push(segMarker);
    }
  }, [stops, showStationDivisions, routeDivisions, liveRailRadarData, simulationState]);

  // 5. Render All Trains Fleet (Multi-Train Live Radar Overview)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    fleetMarkersRef.current.forEach(m => map.removeLayer(m));
    fleetMarkersRef.current = [];

    if (!showAllTrainsFleet || allTrainsLive.length === 0) return;

    allTrainsLive.forEach((t) => {
      // Don't duplicate the active train marker
      if (t.trainNumber === trainNumber) return;

      const fleetHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="w-4 h-4 rounded-full bg-sky-500/30 animate-ping absolute"></div>
          <div class="w-4 h-4 rounded-full bg-sky-600 border border-white shadow-md flex items-center justify-center text-[7px] text-white font-mono font-bold">
            TR
          </div>
          <div class="absolute -bottom-4 whitespace-nowrap bg-white/95 text-sky-900 font-mono text-[8px] font-bold px-1 rounded border border-sky-300 shadow-sm">
            ${t.trainNumber}
          </div>
        </div>
      `;

      const fleetIcon = L.divIcon({
        className: 'fleet-train-marker',
        html: fleetHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([t.latitude, t.longitude], { icon: fleetIcon, zIndexOffset: 1800 }).addTo(map);

      marker.bindTooltip(`
        <div style="font-family: system-ui, sans-serif; font-size: 11px;">
          <b>${t.trainNumber} ${t.trainName}</b><br/>
          Status: <b style="color: #38bdf8;">${t.status}</b> • ${t.speed_kmh} km/h<br/>
          Near: ${t.current_station_name} (${t.active_state})<br/>
          Delay: <b>${t.delay_minutes >= 0 ? '+' : ''}${t.delay_minutes}m</b>
        </div>
      `, { direction: 'top', offset: [0, -10] });

      fleetMarkersRef.current.push(marker);
    });
  }, [showAllTrainsFleet, allTrainsLive, trainNumber]);

  // 6. Auto-Fit Route Bounds once per train change
  const lastFittedTrainRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stops || stops.length === 0) return;

    if (lastFittedTrainRef.current !== trainNumber) {
      const bounds = L.latLngBounds(stops.map(s => [s.latitude, s.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
      lastFittedTrainRef.current = trainNumber;
    }
  }, [trainNumber, stops]);

  // 7. Center on selected station if clicked from timeline
  useEffect(() => {
    if (!mapRef.current || !selectedStationCode || !stops) return;
    const target = stops.find(s => s.station_code === selectedStationCode);
    if (target) {
      mapRef.current.flyTo([target.latitude, target.longitude], 9, { duration: 1.2 });
      const marker = markersRef.current.find(
        (_, idx) => stops[idx]?.station_code === selectedStationCode
      );
      if (marker) marker.openPopup();
    }
  }, [selectedStationCode, stops]);

  // 8. Place Active Train on Map (Live RailRadar GPS or Simulation Kinematics)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!showTrainRoute) {
      if (trainMarkerRef.current) {
        try { map.removeLayer(trainMarkerRef.current); } catch (_) {}
        trainMarkerRef.current = null;
      }
      return;
    }

    let latitude = 0;
    let longitude = 0;
    let bearing = 90;
    let speed_kmh = 0;
    let status = 'RUNNING';
    let readoutLabel = '';
    let currentStn = 'Section';
    let nextStn = 'Terminus';
    let message = 'Operating on track';

    if (isLiveGpsMode && liveRailRadarData) {
      latitude = liveRailRadarData.latitude;
      longitude = liveRailRadarData.longitude;
      bearing = liveRailRadarData.bearing || 90;
      speed_kmh = liveRailRadarData.speed_kmh;
      status = liveRailRadarData.status;
      currentStn = liveRailRadarData.current_station_name || liveRailRadarData.current_station_code;
      nextStn = liveRailRadarData.next_station_name || liveRailRadarData.next_station_code;
      const delay = liveRailRadarData.delay_minutes;
      readoutLabel = `LIVE GPS • ${speed_kmh} km/h • ${delay >= 0 ? '+' : ''}${delay}m Late`;
      message = `Real-time GPS Feed • Near ${currentStn} (${liveRailRadarData.active_state})`;
    } else if (simulationState) {
      latitude = simulationState.latitude;
      longitude = simulationState.longitude;
      bearing = simulationState.bearing;
      speed_kmh = simulationState.speed_kmh;
      status = simulationState.status;
      currentStn = simulationState.current_station.name;
      nextStn = simulationState.next_station.name;
      readoutLabel = `${speed_kmh} km/h • ${status}`;
      message = simulationState.operational_message;
    } else {
      if (trainMarkerRef.current) {
        map.removeLayer(trainMarkerRef.current);
        trainMarkerRef.current = null;
      }
      return;
    }

    const isHalted = status === 'STOPPED_AT_STATION' || speed_kmh === 0;

    const isRajdhani = (trainName || '').toLowerCase().includes('rajdhani') || ['12302', '12952', '12954'].includes(trainNumber);
    const isVandeBharat = (trainName || '').toLowerCase().includes('vande') || (trainName || '').toLowerCase().includes('vb');

    const livery = isRajdhani
      ? { primary: '#dc2626', secondary: '#7f1d1d', stripe: '#fef08a', window: '#fef08a' }
      : isVandeBharat
      ? { primary: '#f8fafc', secondary: '#172b54', stripe: '#ea580c', window: '#67e8f9' }
      : { primary: '#172b54', secondary: '#101e3d', stripe: '#ea580c', window: '#7dd3fc' };

    const trainHtml = `
      <div class="relative flex items-center justify-center pointer-events-none" style="width: 52px; height: 96px;">
        <!-- Live GPS Radar Sonar Ripple -->
        ${isLiveGpsMode ? `
          <div class="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping"></div>
          <div class="absolute -inset-7 rounded-full border border-emerald-400/40 animate-pulse"></div>
        ` : ''}

        <!-- Rotated Realistic Multi-Car Indian Railways Train Consist -->
        <div style="transform: rotate(${bearing}deg); transform-origin: 26px 30px; transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); width: 52px; height: 96px;" class="relative">
          <svg width="52" height="96" viewBox="0 0 52 96" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 14px rgba(0,0,0,0.85));">
            <defs>
              <linearGradient id="train-beam-${trainNumber}" x1="26" y1="18" x2="26" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
                <stop offset="25%" stop-color="#fef08a" stop-opacity="0.7"/>
                <stop offset="65%" stop-color="#38bdf8" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
              </linearGradient>

              <linearGradient id="loco-grad-${trainNumber}" x1="18" y1="16" x2="34" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="${livery.primary}"/>
                <stop offset="60%" stop-color="${livery.secondary}"/>
                <stop offset="100%" stop-color="#091220"/>
              </linearGradient>
            </defs>

            <!-- Headlight Cone -->
            <polygon points="26,18 6,0 46,0" fill="url(#train-beam-${trainNumber})" />

            <!-- Track Bogie Shadows -->
            <rect x="18" y="24" width="16" height="6" rx="2" fill="#020617" opacity="0.9" />
            <rect x="18" y="44" width="16" height="6" rx="2" fill="#020617" opacity="0.9" />
            <rect x="18" y="68" width="16" height="6" rx="2" fill="#020617" opacity="0.9" />

            <!-- Coach 2 Body -->
            <rect x="19" y="52" width="14" height="26" rx="3.5" fill="${livery.secondary}" stroke="#0f172a" stroke-width="0.8" />
            <rect x="19" y="60" width="14" height="4" fill="${livery.stripe}" />

            <!-- Coupler -->
            <rect x="24.5" y="49" width="3" height="4" rx="0.5" fill="#334155" />

            <!-- Lead Locomotive Body -->
            <rect x="18" y="16" width="16" height="33" rx="4" fill="url(#loco-grad-${trainNumber})" stroke="#020617" stroke-width="0.8" />
            <rect x="18" y="27" width="16" height="4" fill="${livery.stripe}" />

            <!-- Windshield & Cab Windows -->
            <path d="M20 18 Q26 15 32 18 L31 22 L21 22 Z" fill="#0ea5e9" stroke="#38bdf8" stroke-width="0.5" />

            <!-- Twin High-Intensity Headlamps -->
            <circle cx="21" cy="16" r="1.5" fill="#ffffff" />
            <circle cx="31" cy="16" r="1.5" fill="#ffffff" />
            <circle cx="26" cy="15" r="1.2" fill="#fef08a" />
          </svg>
        </div>

        <!-- Telemetry Badge (Upright) -->
        <div class="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap ${
          isLiveGpsMode
            ? 'bg-white/95 text-emerald-800 border-emerald-400 shadow-md'
            : isHalted
            ? 'bg-white/95 text-rose-800 border-rose-400 shadow-md'
            : 'bg-white/95 text-[#172b54] border-[#172b54]/40 shadow-md'
        } font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-lg pointer-events-none flex items-center gap-1.5 z-20">
          <span class="w-1.5 h-1.5 rounded-full ${isLiveGpsMode ? 'bg-emerald-500 animate-ping' : isHalted ? 'bg-rose-500' : 'bg-[#172b54]'}"></span>
          <span>${readoutLabel}</span>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'train-animated-marker',
      html: trainHtml,
      iconSize: [52, 96],
      iconAnchor: [26, 30],
      tooltipAnchor: [0, -28]
    });

    const tooltipContent = `
      <b>${trainNumber} ${trainName}</b><br/>
      ${isLiveGpsMode ? '<span style="color:#059669; font-weight:bold;">LIVE GPS</span><br/>' : ''}
      Speed: <b>${speed_kmh} km/h</b> (${status})<br/>
      Current: <b>${currentStn}</b> to Next: <b>${nextStn}</b><br/>
      <span style="font-size: 10px; color: #64748b;">${message}</span>
    `;

    if (!trainMarkerRef.current || !map.hasLayer(trainMarkerRef.current)) {
      if (trainMarkerRef.current) {
        try { map.removeLayer(trainMarkerRef.current); } catch (_) {}
      }
      const trainMarker = L.marker([latitude, longitude], { icon, zIndexOffset: 2000 }).addTo(map);
      trainMarker.bindTooltip(tooltipContent, { direction: 'top', offset: [0, -20], className: 'train-tooltip' });
      trainMarkerRef.current = trainMarker;
    } else {
      trainMarkerRef.current.setLatLng([latitude, longitude]);
      trainMarkerRef.current.setIcon(icon);
      trainMarkerRef.current.setTooltipContent(tooltipContent);
    }

    if (isFollowingTrain) {
      map.panTo([latitude, longitude], { animate: true, duration: 0.25 });
    }
  }, [simulationState, liveRailRadarData, isLiveGpsMode, trainNumber, trainName, isFollowingTrain, showTrainRoute]);

  const fitBoundsToRoute = () => {
    if (!mapRef.current || !stops || stops.length === 0) return;
    if (!showTrainRoute) setShowTrainRoute(true);
    const latLngs: L.LatLngExpression[] = stops.map(s => [s.latitude, s.longitude]);
    mapRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60] });
  };

  // Respond to fitRouteTrigger from external toolbar
  useEffect(() => {
    if (fitRouteTrigger && fitRouteTrigger > 0) {
      fitBoundsToRoute();
    }
  }, [fitRouteTrigger]);

  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isFullCanvas]);

  return (
    <div className={`relative w-full h-full ${
      isFullCanvas
        ? 'rounded-none border-0 shadow-none'
        : 'min-h-[350px] sm:min-h-[460px] lg:min-h-[560px] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-lg'
    }`}>
      <div
        ref={mapContainerRef}
        id="map"
        tabIndex={0}
        aria-label="Indian Railway Interactive GIS Network Map"
        className="w-full h-full z-0 cursor-grab active:cursor-grabbing outline-none"
      />
    </div>
  );
};
