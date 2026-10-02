'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Corridor,
  Train,
  TrainStop,
  DelayEvent,
  TrackBorderCrossing,
  RouteDivisionItem,
  DelayAttributionSummary,
  LiveRailRadarTelemetry
} from '@/lib/types';
import { SimulationState, interpolateTrainPosition } from '@/lib/simulation';
import { calculatePropagatedETA } from '@/lib/eta-engine';

import { MapWrapper } from '@/components/railway/MapWrapper';
import { TelemetryBar } from '@/components/railway/TelemetryBar';
import { SimulationControls } from '@/components/railway/SimulationControls';
import { StopsTimeline } from '@/components/railway/StopsTimeline';
import { MapControlsBar } from '@/components/railway/MapControlsBar';
import { StateLegendBar } from '@/components/railway/StateLegendBar';
import { getStateBorderKey, getStateColor } from '@/lib/types';
import {
  Activity,
  ShieldCheck,
  Compass,
  Clock,
  Layers,
  RefreshCw,
  Train as TrainIcon,
  ExternalLink,
  Radio,
  Flag,
  Globe,
  MapPin,
  CheckCircle2,
  Zap,
  Maximize2,
  Minimize2,
  X,
  ChevronDown,
  Check
} from 'lucide-react';

export default function DashboardPage() {
  // State: Corridors & Trains catalog
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [corridorTrains, setCorridorTrains] = useState<Train[]>([]);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('delhi-howrah');
  const [selectedTrainNumber, setSelectedTrainNumber] = useState<string>('12304');
  const [isEmbedded, setIsEmbedded] = useState<boolean>(false);
  const [isFullCanvas, setIsFullCanvas] = useState<boolean>(false);
  const [isStopsDrawerOpen, setIsStopsDrawerOpen] = useState<boolean>(false);

  // Active Train Data
  const [activeTrain, setActiveTrain] = useState<Train | null>(null);
  const [stops, setStops] = useState<TrainStop[]>([]);
  const [activeEvents, setActiveEvents] = useState<DelayEvent[]>([]);
  const [attribution, setAttribution] = useState<DelayAttributionSummary | null>(null);
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(null);

  // Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2);
  const [progressPercent, setProgressPercent] = useState<number>(21.6);
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);

  // Live RailRadar GPS & Track Divisions State
  const [isLiveGpsMode, setIsLiveGpsMode] = useState<boolean>(true);
  const [liveRailRadarData, setLiveRailRadarData] = useState<LiveRailRadarTelemetry | null>(null);
  const [routeDivisions, setRouteDivisions] = useState<RouteDivisionItem[]>([]);
  const [stateCrossings, setStateCrossings] = useState<TrackBorderCrossing[]>([]);
  const [allTrainsLive, setAllTrainsLive] = useState<LiveRailRadarTelemetry[]>([]);
  const [isRefreshingLive, setIsRefreshingLive] = useState<boolean>(false);

  // Map External Layer Controls & Interaction State
  const [showTrainRoute, setShowTrainRoute] = useState<boolean>(true);
  const [isFollowingTrain, setIsFollowingTrain] = useState<boolean>(false);
  const [showStateDivisions, setShowStateDivisions] = useState<boolean>(true);
  const [showStationDivisions, setShowStationDivisions] = useState<boolean>(true);
  const [showAllTrainsFleet, setShowAllTrainsFleet] = useState<boolean>(false);
  const [fitRouteTrigger, setFitRouteTrigger] = useState<number>(0);

  // Automatically enable train route when train selection changes
  useEffect(() => {
    if (selectedTrainNumber) {
      setShowTrainRoute(true);
    }
  }, [selectedTrainNumber]);

  // Dropdown states for Corridor and Train selectors
  const [isCorridorDropdownOpen, setIsCorridorDropdownOpen] = useState<boolean>(false);
  const [isTrainDropdownOpen, setIsTrainDropdownOpen] = useState<boolean>(false);
  const corridorDropdownRef = useRef<HTMLDivElement>(null);
  const trainDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (corridorDropdownRef.current && !corridorDropdownRef.current.contains(event.target as Node)) {
        setIsCorridorDropdownOpen(false);
      }
      if (trainDropdownRef.current && !trainDropdownRef.current.contains(event.target as Node)) {
        setIsTrainDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleFitRoute = useCallback(() => {
    if (!showTrainRoute) setShowTrainRoute(true);
    setFitRouteTrigger(prev => prev + 1);
  }, [showTrainRoute]);

  // Loading, IST Time & Mobile View
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [istTime, setIstTime] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'map' | 'schedule' | 'both'>('map');

  // Stable refs for animation loop
  const stopsRef = useRef<TrainStop[]>(stops);
  stopsRef.current = stops;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const playbackSpeedRef = useRef<number>(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;

  const progressPercentRef = useRef<number>(progressPercent);
  progressPercentRef.current = progressPercent;

  const isLiveGpsModeRef = useRef<boolean>(isLiveGpsMode);
  isLiveGpsModeRef.current = isLiveGpsMode;

  // Handle URL query parameters and parent window postMessage for embedded/standalone interoperability
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTrain = params.get('train');
      const urlCorridor = params.get('corridor');
      const embedMode = params.get('embed') === 'true' || params.get('embed') === '1';
      const canvasMode = params.get('canvas') === 'true' || params.get('full') === 'true' || params.get('fullscreen') === 'true';
      const inIframe = window.parent && window.parent !== window;

      if (embedMode) setIsEmbedded(true);
      if (embedMode || canvasMode || inIframe) setIsFullCanvas(true);
      if (urlCorridor) setSelectedCorridorId(urlCorridor);
      if (urlTrain) setSelectedTrainNumber(urlTrain);

      const handleIncomingMessage = (event: MessageEvent) => {
        try {
          const payload = event.data;
          if (!payload || typeof payload !== 'object') return;

          if (payload.type === 'SELECT_TRAIN' && payload.trainNumber) {
            const tNum = String(payload.trainNumber).trim();
            setSelectedTrainNumber(tNum);
          }
          if (payload.type === 'SELECT_CORRIDOR' && payload.corridorId) {
            setSelectedCorridorId(String(payload.corridorId).trim());
          }
          if (payload.type === 'SET_PLAYBACK') {
            if (typeof payload.isPlaying === 'boolean') setIsPlaying(payload.isPlaying);
            if (typeof payload.speed === 'number') setPlaybackSpeed(payload.speed);
          }
          if (payload.type === 'SET_LIVE_GPS') {
            if (typeof payload.isLive === 'boolean') setIsLiveGpsMode(payload.isLive);
          }
          if (payload.type === 'TOGGLE_FULL_CANVAS') {
            setIsFullCanvas(prev => !prev);
          }
          if (payload.type === 'SET_FULL_CANVAS' && typeof payload.fullCanvas === 'boolean') {
            setIsFullCanvas(payload.fullCanvas);
          }
        } catch {
          // ignore external non-JSON messages
        }
      };

      window.addEventListener('message', handleIncomingMessage);

      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'MAPPING_SYSTEM_READY', version: '2.0' }, '*');
        }
      } catch {}

      return () => {
        window.removeEventListener('message', handleIncomingMessage);
      };
    }
  }, []);

  // Broadcast train change to parent window if embedded
  useEffect(() => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window && activeTrain) {
      window.parent.postMessage({
        type: 'MAPPING_TRAIN_CHANGED',
        trainNumber: selectedTrainNumber,
        trainName: activeTrain.train_name,
        corridorId: selectedCorridorId
      }, '*');
    }
  }, [selectedTrainNumber, activeTrain, selectedCorridorId]);

  // Update IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Corridors and Trains on Initial Mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const [cRes, tRes] = await Promise.all([
          fetch('/api/corridors').then(r => r.json()),
          fetch('/api/trains').then(r => r.json())
        ]);

        if (cRes.success) setCorridors(cRes.data);
        if (tRes.success) {
          setTrains(tRes.data);
          const initialMatching = tRes.data.filter((t: Train) => t.corridor_id === selectedCorridorId);
          setCorridorTrains(initialMatching.length > 0 ? initialMatching : tRes.data);
        }
      } catch (err) {
        console.error('Failed to load railway catalog:', err);
      }
    }
    loadCatalog();
  }, []);

  // Load All Trains Live Telemetry on mount & every 30s
  const fetchAllTrainsLiveTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/trains/live-all');
      const json = await res.json();
      if (json.success && Array.isArray(json.trains)) {
        setAllTrainsLive(json.trains);
      }
    } catch (e) {
      console.warn('Could not load all trains live feed:', e);
    }
  }, []);

  useEffect(() => {
    fetchAllTrainsLiveTelemetry();
    const interval = setInterval(fetchAllTrainsLiveTelemetry, 30000);
    return () => clearInterval(interval);
  }, [fetchAllTrainsLiveTelemetry]);

  // Dynamically load trains from database whenever selected corridor changes
  useEffect(() => {
    if (!selectedCorridorId) return;
    async function fetchCorridorTrains() {
      try {
        const res = await fetch(`/api/trains?corridor=${selectedCorridorId}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setCorridorTrains(data.data);
          const hasCurrent = data.data.some((t: Train) => t.train_number === selectedTrainNumber);
          if (!hasCurrent) {
            setSelectedTrainNumber(data.data[0].train_number);
          }
        }
      } catch (err) {
        console.error('Failed to fetch trains for corridor:', err);
      }
    }
    fetchCorridorTrains();
  }, [selectedCorridorId]);

  // Handlers for switching corridor and train
  const handleSelectCorridor = (corridorId: string) => {
    setSelectedCorridorId(corridorId);
    const matching = trains.filter(t => t.corridor_id === corridorId);
    if (matching.length > 0) {
      setCorridorTrains(matching);
      setSelectedTrainNumber(matching[0].train_number);
    }
  };

  const handleSelectTrain = (trainNum: string) => {
    setSelectedTrainNumber(trainNum);
    const matchingTrain = trains.find(t => t.train_number === trainNum);
    if (matchingTrain && matchingTrain.corridor_id && matchingTrain.corridor_id !== selectedCorridorId) {
      setSelectedCorridorId(matchingTrain.corridor_id);
    }
  };

  // Fetch Active Train Route & Data
  const fetchTrainRoute = useCallback(async (trainNum: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trains/${trainNum}/route`);
      const data = await res.json();

      if (data.success) {
        const rawStops = data.stops || data.route || [];
        const normalizedStops: TrainStop[] = rawStops.map((s: any, idx: number) => ({
          id: s.id || (idx + 1),
          train_number: trainNum,
          stop_sequence: s.stop_sequence ?? s.sequence ?? (idx + 1),
          sequence: s.stop_sequence ?? s.sequence ?? (idx + 1),
          station_code: s.station_code || s.code || '',
          code: s.station_code || s.code || '',
          station_name: s.station_name || s.station || '',
          station: s.station_name || s.station || '',
          latitude: s.latitude ?? s.lat ?? 0,
          longitude: s.longitude ?? s.lng ?? 0,
          state: s.state || '',
          zone: s.zone || '',
          osm_id: s.osm_id || '',
          osm_type: s.osm_type || 'node',
          halt_minutes: s.halt_minutes ?? 2,
          scheduled_arrival: s.scheduled_arrival ?? s.scheduledArrival ?? '--:--',
          scheduled_departure: s.scheduled_departure ?? s.scheduledDeparture ?? '--:--',
          distance_km: s.distance_km ?? 0,
          day_number: s.day_number ?? 1,
          platform: s.platform ?? '1',
          predicted_eta: s.predicted_eta ?? s.eta ?? s.scheduled_arrival ?? '--:--',
          delay_minutes: s.delay_minutes ?? s.delay ?? 0,
          cause_type: s.cause_type ?? 'ON_TIME',
          cause_description: s.cause_description ?? s.cause ?? 'Operating per schedule',
          confidence: s.confidence ?? 0.92
        }));

        setActiveTrain({
          ...data.train,
          train_number: data.train.train_number || data.train.number || trainNum,
          train_name: data.train.train_name || data.train.name || 'Express',
          source_name: data.train.source_name || data.train.source || '',
          destination_name: data.train.destination_name || data.train.destination || '',
          scheduled_arrival: data.train.scheduled_arrival || data.train.arrival_time || '',
          scheduled_departure: data.train.scheduled_departure || data.train.departure_time || ''
        });
        setStops(normalizedStops);
        setAttribution(data.delay_attribution);

        // Fetch active delay events
        let delayEvents: DelayEvent[] = [];
        try {
          const etaRes = await fetch(`/api/trains/${trainNum}/eta`);
          const etaData = await etaRes.json();
          if (etaData.success && etaData.active_delay_events) {
            delayEvents = etaData.active_delay_events;
            setActiveEvents(delayEvents);
          }
        } catch (e) {
          console.warn('Could not fetch active delay events:', e);
        }

        // Fetch Live RailRadar Telemetry
        let liveProg = 21.6;
        let liveData: any = null;
        try {
          const liveRes = await fetch(`/api/trains/${trainNum}/live`);
          const liveJson = await liveRes.json();
          if (liveJson.success && liveJson.data) {
            liveData = liveJson.data;
            setLiveRailRadarData(liveData);
            liveProg = Number(liveJson.data.progress_percent) || 21.6;
          }
        } catch (err) {
          console.warn('Could not fetch live telemetry:', err);
        }

        // Fetch Railway Track Divisions (Stations & State Borders)
        try {
          const divRes = await fetch(`/api/divisions?train=${trainNum}`);
          const divJson = await divRes.json();
          if (divJson.success && divJson.data) {
            setRouteDivisions(divJson.data.station_divisions || []);
            setStateCrossings(divJson.data.state_border_crossings || []);
          }
        } catch (err) {
          console.warn('Could not fetch track divisions:', err);
        }

        // Calculate dynamic ETA propagation based on active events or live telemetry delay
        let finalStops = normalizedStops;
        const effectiveEvents = [...delayEvents];
        if (effectiveEvents.length === 0 && liveData && liveData.delay_minutes > 0 && liveData.current_station_code) {
          effectiveEvents.push({
            id: 999,
            train_number: trainNum,
            station_code: liveData.current_station_code,
            station_name: liveData.current_station || liveData.current_station_code,
            delay_minutes: Number(liveData.delay_minutes),
            cause_type: 'LIVE_RAILRADAR_GPS',
            cause_description: `Live track telemetry delay (+${liveData.delay_minutes}m)`,
            confidence: 0.95,
            event_time: new Date().toISOString()
          });
        }

        if (effectiveEvents.length > 0) {
          const { predictions, attribution: attr } = calculatePropagatedETA(normalizedStops, effectiveEvents, 2);
          setAttribution(attr);
          finalStops = normalizedStops.map((s, idx) => {
            const pred = predictions.find(p => p.station_code === s.station_code) || predictions[idx];
            return pred ? {
              ...s,
              predicted_eta: pred.predicted_eta,
              delay_minutes: pred.delay_minutes,
              cause_type: pred.cause_type,
              cause_description: pred.cause_description,
              confidence: pred.confidence
            } : s;
          });
        }

        setStops(finalStops);

        progressPercentRef.current = liveProg;
        setProgressPercent(liveProg);

        if (normalizedStops.length > 0) {
          const sim = interpolateTrainPosition(normalizedStops, liveProg);
          setSimulationState(sim);
        }
      }
    } catch (err) {
      console.error('Failed to fetch train route:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTrainNumber) {
      fetchTrainRoute(selectedTrainNumber);
    }
  }, [selectedTrainNumber, fetchTrainRoute]);

  // Periodic polling of RailRadar live GPS position when in Live GPS mode
  useEffect(() => {
    if (!isLiveGpsMode || !selectedTrainNumber) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trains/${selectedTrainNumber}/live`);
        const json = await res.json();
        if (json.success && json.data) {
          setLiveRailRadarData(json.data);
          const liveProg = Number(json.data.progress_percent);
          if (!isNaN(liveProg) && liveProg > 0) {
            progressPercentRef.current = liveProg;
            setProgressPercent(liveProg);
          }
        }
      } catch (e) {}
    }, 12000);

    return () => clearInterval(interval);
  }, [isLiveGpsMode, selectedTrainNumber]);

  // Manual Refresh of Live RailRadar Telemetry
  const handleManualLiveRefresh = async () => {
    if (!selectedTrainNumber) return;
    setIsRefreshingLive(true);
    try {
      const res = await fetch(`/api/trains/${selectedTrainNumber}/live`);
      const json = await res.json();
      if (json.success && json.data) {
        setLiveRailRadarData(json.data);
        const liveProg = Number(json.data.progress_percent);
        if (!isNaN(liveProg) && liveProg > 0) {
          progressPercentRef.current = liveProg;
          setProgressPercent(liveProg);
        }
      }
      await fetchAllTrainsLiveTelemetry();
    } catch (e) {
      console.warn('Error refreshing live data:', e);
    } finally {
      setIsRefreshingLive(false);
    }
  };

  // Simulation Animation Loop (Only active when NOT in Live GPS mode or when user manually plays)
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    lastTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      // Only advance progress automatically if in simulation mode and playing
      if (!isLiveGpsModeRef.current && isPlayingRef.current && stopsRef.current.length > 0) {
        const deltaProgress = 1.2 * playbackSpeedRef.current * deltaTime;
        let next = progressPercentRef.current + deltaProgress;
        if (next > 100) next = 0;
        progressPercentRef.current = next;

        const newSim = interpolateTrainPosition(stopsRef.current, next);
        setSimulationState(newSim);
        setProgressPercent(next);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleSeek = (newPercent: number) => {
    setIsLiveGpsMode(false); // Switch to manual simulation if operator scrubs slider
    progressPercentRef.current = newPercent;
    setProgressPercent(newPercent);
    if (stops.length > 0) {
      const sim = interpolateTrainPosition(stops, newPercent);
      setSimulationState(sim);
    }
  };

  const handleStationClick = (stationCode: string) => {
    setSelectedStationCode(prev => prev === stationCode ? null : stationCode);
  };

  const handleNextStation = () => {
    if (!stops || stops.length === 0 || !simulationState) return;
    const currentSeq = simulationState.current_station.sequence;
    const nextStop = stops.find(
      s => (s.stop_sequence ?? (s as any).sequence) === currentSeq + 1
    ) || stops[stops.length - 1];
    const targetCode = nextStop.station_code || (nextStop as any).code;
    if (targetCode) handleStationClick(targetCode);
  };

  const handlePrevStation = () => {
    if (!stops || stops.length === 0 || !simulationState) return;
    const currentSeq = simulationState.current_station.sequence;
    const prevStop = stops.find(
      s => (s.stop_sequence ?? (s as any).sequence) === Math.max(1, currentSeq - 1)
    ) || stops[0];
    const targetCode = prevStop.station_code || (prevStop as any).code;
    if (targetCode) handleStationClick(targetCode);
  };

  const destinationEta = stops[stops.length - 1]?.predicted_eta || activeTrain?.scheduled_arrival || '--:--';
  const liveSeq = liveRailRadarData?.current_station_code
    ? stops.find(s => s.station_code === liveRailRadarData.current_station_code)?.stop_sequence
    : null;
  const currentStopSeq = (isLiveGpsMode && liveSeq) ? liveSeq : (simulationState?.current_station.sequence || 2);

  const handleInjectDelay = async (stationCode: string, minutes: number, causeType: string, description: string) => {
    if (!selectedTrainNumber) return;
    try {
      const res = await fetch(`/api/trains/${selectedTrainNumber}/delay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_code: stationCode,
          delay_minutes: minutes,
          cause_type: causeType,
          cause_description: description
        })
      });
      const json = await res.json();
      if (json.success) {
        setActiveEvents(json.active_events || []);
        if (json.attribution) setAttribution(json.attribution);
        if (json.predictions && json.predictions.length > 0) {
          setStops(prev => prev.map((s, idx) => {
            const pred = json.predictions.find((p: any) => p.station_code === s.station_code) || json.predictions[idx];
            return pred ? {
              ...s,
              predicted_eta: pred.predicted_eta,
              delay_minutes: pred.delay_minutes,
              cause_type: pred.cause_type,
              cause_description: pred.cause_description,
              confidence: pred.confidence
            } : s;
          }));
        }
      }
    } catch (err) {
      console.error('Failed to inject delay:', err);
    }
  };

  const handleResetDelays = async () => {
    if (!selectedTrainNumber) return;
    try {
      const res = await fetch(`/api/trains/${selectedTrainNumber}/delay`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        setActiveEvents([]);
        if (json.attribution) setAttribution(json.attribution);
        if (json.predictions && json.predictions.length > 0) {
          setStops(prev => prev.map((s, idx) => {
            const pred = json.predictions.find((p: any) => p.station_code === s.station_code) || json.predictions[idx];
            return pred ? {
              ...s,
              predicted_eta: pred.predicted_eta,
              delay_minutes: pred.delay_minutes,
              cause_type: pred.cause_type,
              cause_description: pred.cause_description,
              confidence: pred.confidence
            } : s;
          }));
        }
      }
    } catch (err) {
      console.error('Failed to reset delays:', err);
    }
  };

  if (isFullCanvas) {
    return (
      <main className="relative w-screen h-screen flex flex-col overflow-hidden bg-slate-100 p-0 m-0 text-slate-800">
        {/* Top Header Bar */}
        <header className="z-[450] bg-white border-b border-slate-200/90 px-3 py-2 shrink-0 flex items-center justify-between gap-2 shadow-xs">
          {/* Left: Branding & Train/Corridor Switchers */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <TrainIcon className="w-5 h-5 text-[#172b54]" />
              <span className="text-xs font-black text-[#172b54] tracking-wide uppercase hidden sm:inline">
                TRETA GIS
              </span>
              <span className="bg-orange-50 text-orange-600 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-orange-200 shadow-2xs">
                FULL CANVAS
              </span>
            </div>

            {/* Corridor Selector Dropdown */}
            <select
              value={selectedCorridorId}
              onChange={(e) => handleSelectCorridor(e.target.value)}
              aria-label="Select Corridor"
              className="bg-slate-50 border border-slate-200 text-[#172b54] rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#172b54] cursor-pointer shadow-2xs"
            >
              {corridors.map(c => (
                <option key={c.id} value={c.id} className="bg-white text-slate-900">
                  {c.name}
                </option>
              ))}
            </select>

            {/* Train Selector Dropdown */}
            <select
              value={selectedTrainNumber}
              onChange={(e) => handleSelectTrain(e.target.value)}
              aria-label="Select Train"
              className="bg-slate-50 border border-slate-200 text-[#172b54] rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#172b54] cursor-pointer shadow-2xs"
            >
              {corridorTrains.map(t => (
                <option key={t.train_number} value={t.train_number} className="bg-white text-slate-900">
                  {t.train_number} - {t.train_name}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Actions & Exit */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleManualLiveRefresh}
              disabled={isRefreshingLive}
              title="Sync Live GPS"
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3 h-3 text-[#172b54] ${isRefreshingLive ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline text-[11px]">Sync</span>
            </button>

            <button
              onClick={() => setIsStopsDrawerOpen(!isStopsDrawerOpen)}
              title="Toggle Stoppage Schedule Timeline"
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer shadow-2xs ${
                isStopsDrawerOpen
                  ? 'bg-[#172b54] text-white border-[#172b54] shadow-[#172b54]/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${isStopsDrawerOpen ? 'text-white' : 'text-[#172b54]'}`} />
              <span className="hidden sm:inline text-[11px]">Stops ({stops.length})</span>
            </button>

            <button
              onClick={() => setIsFullCanvas(false)}
              title="Exit Full Canvas (Switch to Split Dashboard)"
              className="bg-[#172b54] hover:bg-[#101e3d] border border-[#172b54] text-white px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-[#172b54]/25 cursor-pointer transition-all active:scale-95"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Split View</span>
            </button>
          </div>
        </header>

        {/* Map Action Bar on the Website Canvas outside map */}
        <div className="z-[440] bg-white border-b border-slate-200/90 px-3 py-1.5 shrink-0 shadow-xs">
          <MapControlsBar
            isFullCanvas={true}
            onToggleFullCanvas={() => setIsFullCanvas(false)}
            showTrainRoute={showTrainRoute}
            onToggleTrainRoute={() => setShowTrainRoute(!showTrainRoute)}
            onFitRoute={handleFitRoute}
            isFollowingTrain={isFollowingTrain}
            onToggleFollowTrain={() => {
              if (!showTrainRoute && !isFollowingTrain) setShowTrainRoute(true);
              setIsFollowingTrain(!isFollowingTrain);
            }}
            isLiveGpsMode={isLiveGpsMode}
            onToggleLiveGpsMode={() => setIsLiveGpsMode(!isLiveGpsMode)}
            showStateDivisions={showStateDivisions}
            onToggleStateDivisions={() => setShowStateDivisions(!showStateDivisions)}
            showStationDivisions={showStationDivisions}
            onToggleStationDivisions={() => setShowStationDivisions(!showStationDivisions)}
            showAllTrainsFleet={showAllTrainsFleet}
            onToggleAllTrainsFleet={() => setShowAllTrainsFleet(!showAllTrainsFleet)}
            allTrainsCount={allTrainsLive.length}
          />
        </div>

        {/* Dedicated State Territory & Divisions Legend (Placed Separately!) */}
        {showTrainRoute && showStateDivisions && uniqueStatesOnRoute.length > 0 && (
          <div className="z-[430] bg-slate-50 border-b border-slate-200/90 px-3 py-1.5 shrink-0 shadow-2xs">
            <StateLegendBar
              uniqueStatesOnRoute={uniqueStatesOnRoute}
              stateCrossings={stateCrossings}
              isVisible={true}
            />
          </div>
        )}

        {/* Pure Map Canvas Container (Takes remaining flex-1 viewport height) */}
        <div className="flex-1 w-full relative min-h-0 bg-slate-100">
          <MapWrapper
            stops={stops}
            trainNumber={selectedTrainNumber}
            trainName={activeTrain?.train_name || 'Train'}
            simulationState={simulationState}
            isSimulating={isPlaying}
            onSelectStation={(code) => handleStationClick(code)}
            selectedStationCode={selectedStationCode}
            liveRailRadarData={liveRailRadarData}
            isLiveGpsMode={isLiveGpsMode}
            onToggleLiveGpsMode={() => setIsLiveGpsMode(!isLiveGpsMode)}
            stateCrossings={stateCrossings}
            routeDivisions={routeDivisions}
            allTrainsLive={allTrainsLive}
            isFullCanvas={true}
            onToggleFullCanvas={() => setIsFullCanvas(false)}
            showTrainRoute={showTrainRoute}
            onToggleShowTrainRoute={() => setShowTrainRoute(!showTrainRoute)}
            isFollowingTrain={isFollowingTrain}
            onToggleFollowTrain={() => setIsFollowingTrain(!isFollowingTrain)}
            showStateDivisions={showStateDivisions}
            onToggleShowStateDivisions={() => setShowStateDivisions(!showStateDivisions)}
            showStationDivisions={showStationDivisions}
            onToggleShowStationDivisions={() => setShowStationDivisions(!showStationDivisions)}
            showAllTrainsFleet={showAllTrainsFleet}
            onToggleShowAllTrainsFleet={() => setShowAllTrainsFleet(!showAllTrainsFleet)}
            fitRouteTrigger={fitRouteTrigger}
          />
        </div>

        {/* Sliding Stops Drawer on the Right */}
        {isStopsDrawerOpen && (
          <div className="fixed top-0 right-0 h-full w-[360px] sm:w-[420px] max-w-[90vw] z-[600] bg-white/98 backdrop-blur-2xl border-l border-slate-200 shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-right duration-200 text-slate-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Station Stoppages ({stops.length})
                </h3>
              </div>
              <button
                onClick={() => setIsStopsDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Close Stops Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <StopsTimeline
              stops={stops}
              currentStopSequence={currentStopSeq}
              selectedStationCode={selectedStationCode}
              onSelectStation={(code) => handleStationClick(code)}
              onInjectDelay={handleInjectDelay}
              onResetDelays={handleResetDelays}
              attribution={attribution}
              isLiveGpsMode={isLiveGpsMode}
            />
          </div>
        )}

        {/* Bottom Floating Simulation Controls if in Simulation Mode */}
        {!isLiveGpsMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[450] max-w-xl w-[calc(100vw-24px)]">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2.5 shadow-xl">
              <SimulationControls
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onReset={() => handleSeek(0)}
                onNextStation={handleNextStation}
                onPrevStation={handlePrevStation}
                playbackSpeed={playbackSpeed}
                onChangeSpeed={(spd) => setPlaybackSpeed(spd)}
                progressPercent={progressPercent}
                onSeek={handleSeek}
              />
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-2.5 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Top Header Bar */}
      {isEmbedded ? (
        <header className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/90 bg-white px-3 py-2 rounded-xl shadow-xs">
          <div className="flex items-center gap-2">
            <TrainIcon className="w-4 h-4 text-[#172b54]" />
            <span className="text-xs font-bold text-[#172b54] tracking-wide uppercase">
              TRETA GIS TRACK &amp; DIVISIONS VIEWER
            </span>
            <span className="bg-orange-50 text-orange-600 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border border-orange-200">
              EMBEDDED
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsFullCanvas(true)}
              title="Utilise Whole Canvas (Full Screen Map)"
              className="bg-[#172b54] hover:bg-[#101e3d] border border-[#172b54] rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-xs text-white font-semibold transition-all cursor-pointer shadow-sm shadow-[#172b54]/20 active:scale-95"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="text-[10px] font-mono">Full Canvas</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
              <Clock className="w-3 h-3 text-[#172b54]" />
              <span>{istTime || 'IST'}</span>
            </div>
            <a
              href={`/?train=${selectedTrainNumber}&corridor=${selectedCorridorId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#172b54] hover:text-[#101e3d] bg-[#172b54]/10 hover:bg-[#172b54]/15 border border-[#172b54]/20 px-2.5 py-1 rounded-lg transition-colors"
            >
              <span>Pop-out Window</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>
      ) : (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-slate-200/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#172b54] via-[#1e3a70] to-[#101e3d] p-0.5 shadow-md shadow-[#172b54]/15 shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <TrainIcon className="w-5 h-5 text-[#172b54]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-[#172b54] uppercase">
                  TRETA MAPPING &amp; DIVISIONS SYSTEM
                </h1>
                <span className="bg-orange-50 text-orange-600 font-mono text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-orange-200 tracking-wider">
                  SIH 26028
                </span>
                {/* <span className="bg-emerald-50 text-emerald-800 font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" /> RAILRADAR LIVE
                </span> */}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                True track GIS curves, real-time GPS telemetry, and station/state territorial divisions
              </p>
            </div>
          </div>

          {/* Live IST Clock, Full Canvas & Live Feed Status */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setIsFullCanvas(true)}
              title="Utilise Whole Canvas (Full Screen Map)"
              className="bg-[#172b54] hover:bg-[#101e3d] border border-[#172b54] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-white font-bold transition-all cursor-pointer shadow-md shadow-[#172b54]/20 active:scale-95"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono">Full Canvas</span>
            </button>

            <button
              onClick={handleManualLiveRefresh}
              disabled={isRefreshingLive}
              title="Refresh Real-Time GPS"
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#172b54] ${isRefreshingLive ? 'animate-spin' : ''}`} />
              <span className="text-[11px] font-mono">Sync GPS</span>
            </button>

            <div className="bg-white border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-2 text-[11px] sm:text-xs font-mono shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-[#172b54]" />
              <span className="text-slate-800 font-semibold">{istTime || 'IST'}</span>
            </div>
          </div>
        </header>
      )}

      {/* Dynamic Corridor & Trains Section */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3.5 shadow-sm space-y-2.5">
        {/* Row 1: Corridor Dropdown Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#172b54]" />
              <span className="text-xs uppercase font-bold text-slate-800 tracking-wider">
                Railway Corridor:
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">({corridors.length} Trunks)</span>
          </div>

          <div ref={corridorDropdownRef} className="relative self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setIsCorridorDropdownOpen(prev => !prev);
                setIsTrainDropdownOpen(false);
              }}
              className="bg-[#172b54] text-white shadow-md shadow-[#172b54]/20 ring-1 ring-[#172b54] font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer active:scale-95"
            >
              <span>{corridors.find(c => c.id === selectedCorridorId)?.name || 'Select Corridor'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${isCorridorDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCorridorDropdownOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-64 sm:w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 tracking-wider border-b border-slate-100 mb-1">
                  Select Trunk Corridor ({corridors.length})
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin">
                  {corridors.map(c => {
                    const isSelected = c.id === selectedCorridorId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          handleSelectCorridor(c.id);
                          setIsCorridorDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#172b54] text-white font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div>{c.name}</div>
                          <div className={`text-[10px] font-normal ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                            {c.origin_city} → {c.destination_city}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Dynamic Trains Dropdown Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <TrainIcon className="w-4 h-4 text-[#172b54]" />
              <span className="text-xs uppercase font-bold text-slate-800 tracking-wider">
                Trains:
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono truncate max-w-[200px] sm:max-w-none">
              ({corridorTrains.length} in Corridor)
            </span>
          </div>

          <div ref={trainDropdownRef} className="relative self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setIsTrainDropdownOpen(prev => !prev);
                setIsCorridorDropdownOpen(false);
              }}
              className="bg-[#172b54]/5 border border-[#172b54] shadow-sm ring-1 ring-[#172b54]/40 text-slate-900 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs transition-all flex items-center justify-between gap-2 sm:gap-3 cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-orange-500 shadow-xs animate-pulse shrink-0" />
                <span className="font-bold font-mono text-orange-600 shrink-0">{activeTrain?.train_number || selectedTrainNumber}</span>
                <span className="font-semibold text-slate-800 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">{activeTrain?.train_name}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono hidden md:flex items-center gap-1.5 border-l border-slate-200 pl-2.5 shrink-0">
                <span>{activeTrain?.source_name || activeTrain?.source_code} to {activeTrain?.destination_name || activeTrain?.destination_code}</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-semibold">Dep {activeTrain?.scheduled_departure}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ml-1 ${isTrainDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTrainDropdownOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-72 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 tracking-wider border-b border-slate-100 mb-1">
                  Select Train in Corridor ({corridorTrains.length})
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin">
                  {corridorTrains.map(t => {
                    const isSelected = t.train_number === selectedTrainNumber;
                    return (
                      <button
                        key={t.train_number}
                        type="button"
                        onClick={() => {
                          handleSelectTrain(t.train_number);
                          setIsTrainDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#172b54]/10 border border-[#172b54]/30 text-slate-900 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'}`} />
                            <span className="font-bold font-mono text-orange-600">{t.train_number}</span>
                            <span className="font-semibold text-slate-900 truncate">{t.train_name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 pl-3.5 flex items-center gap-1.5">
                            <span>{t.source_name || t.source_code} → {t.destination_name || t.destination_code}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-emerald-700">Dep {t.scheduled_departure}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#172b54] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Real-Time Live RailRadar Telemetry & Track Divisions Ribbon */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Live Status & Location */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
            isLiveGpsMode
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-sky-100 text-sky-800 border border-sky-200'
          }`}>
            <Radio className={`w-5 h-5 ${isLiveGpsMode ? 'animate-pulse' : ''}`} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLiveGpsMode
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}>
                {isLiveGpsMode ? 'LIVE GPS ACTIVE' : 'SIMULATION MODE'}
              </span>

              {liveRailRadarData && (
                <span className="text-slate-700 font-semibold text-xs">
                  Near <span className="text-slate-900 font-bold">{liveRailRadarData.current_station_name}</span> ({liveRailRadarData.distance_from_origin_km.toFixed(1)} km)
                </span>
              )}

              {liveRailRadarData && (
                <span className={`font-mono font-bold text-[11px] ${
                  liveRailRadarData.delay_minutes > 15
                    ? 'text-rose-700'
                    : liveRailRadarData.delay_minutes > 0
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}>
                  {liveRailRadarData.delay_minutes > 0 ? `+${liveRailRadarData.delay_minutes}m Late` : 'On Time'}
                </span>
              )}
            </div>

            {/* Division Architecture Details */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap font-mono">
              <span className="flex items-center gap-1 text-amber-800 font-medium">
                <Flag className="w-3 h-3 text-amber-600" />
                <span>Territory: <b className="text-amber-900">{liveRailRadarData?.active_state || 'State'} ({liveRailRadarData?.active_state_border_key || 'SB'})</b></span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-sky-800 font-medium">
                <Layers className="w-3 h-3 text-sky-600" />
                <span>Active Block: <b className="text-sky-900">{liveRailRadarData?.active_division_segment_id || 'TS-SEG'}</b></span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700">
                Speed: <b className="text-slate-900">{liveRailRadarData?.speed_kmh || simulationState?.speed_kmh || 0} km/h</b>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Mode Switcher & Division Count Badges */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setIsLiveGpsMode(true)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                isLiveGpsMode
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3 h-3 text-white" />
              <span>Live GPS</span>
            </button>
            <button
              onClick={() => setIsLiveGpsMode(false)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                !isLiveGpsMode
                  ? 'bg-[#172b54] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3 h-3 text-white" />
              <span>Simulate</span>
            </button>
          </div>

          {/* Division Summary Badges */}
          <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-700 flex items-center gap-2">
            <span className="text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              {stateCrossings.length} Inter-State Transitions
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-sky-800 font-bold">{Math.max(0, stops.length - 1)} Block Divisions</span>
          </div>
        </div>
      </section>

      {/* Telemetry Status Banner */}
      {activeTrain && (
        <TelemetryBar
          train={activeTrain}
          simulationState={simulationState}
          destinationEta={destinationEta}
        />
      )}

      {/* Responsive View Switcher for Small Phones (<768px / md) */}
      <div className="flex md:hidden items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <span className="text-[11px] font-mono text-slate-500 pl-2.5 hidden xs:inline">View:</span>
        <div className="flex items-center gap-1 w-full xs:w-auto justify-end">
          <button
            onClick={() => setMobileTab('map')}
            className={`flex-1 xs:flex-initial px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'map'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          <button
            onClick={() => setMobileTab('schedule')}
            className={`flex-1 xs:flex-initial px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'schedule'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stops ({stops.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('both')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileTab === 'both'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Both</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Split: Map + Stops Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 lg:gap-6 items-start">
        {/* Left Column: Controls & GIS Map */}
        <div className={`md:col-span-7 lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-4 ${
          mobileTab === 'schedule' ? 'hidden md:block' : 'block'
        }`}>
          {/* Controls: If in Live GPS mode, displays live GPS telemetry bar; otherwise interactive playback controls */}
          {!isLiveGpsMode ? (
            <SimulationControls
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onReset={() => handleSeek(0)}
              onNextStation={handleNextStation}
              onPrevStation={handlePrevStation}
              playbackSpeed={playbackSpeed}
              onChangeSpeed={(spd) => setPlaybackSpeed(spd)}
              progressPercent={progressPercent}
              onSeek={handleSeek}
            />
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Real-Time Physical Train Location Anchored via Live GPS
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-slate-500 font-mono text-[10px]">
                  Updated: {liveRailRadarData?.last_updated_at ? new Date(liveRailRadarData.last_updated_at).toLocaleTimeString() : 'Live'}
                </span>
                <button
                  onClick={() => setIsLiveGpsMode(false)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-sky-800 font-semibold text-[11px] rounded-lg transition-colors cursor-pointer border border-slate-200"
                >
                  Switch to Simulation
                </button>
              </div>
            </div>
          )}

          {/* Dedicated Map Action Bar on the Website Canvas (Outside the Map!) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-sm">
            <MapControlsBar
              isFullCanvas={false}
              onToggleFullCanvas={() => setIsFullCanvas(true)}
              showTrainRoute={showTrainRoute}
              onToggleTrainRoute={() => setShowTrainRoute(!showTrainRoute)}
              onFitRoute={handleFitRoute}
              isFollowingTrain={isFollowingTrain}
              onToggleFollowTrain={() => {
                if (!showTrainRoute && !isFollowingTrain) setShowTrainRoute(true);
                setIsFollowingTrain(!isFollowingTrain);
              }}
              isLiveGpsMode={isLiveGpsMode}
              onToggleLiveGpsMode={() => setIsLiveGpsMode(!isLiveGpsMode)}
              showStateDivisions={showStateDivisions}
              onToggleStateDivisions={() => setShowStateDivisions(!showStateDivisions)}
              showStationDivisions={showStationDivisions}
              onToggleStationDivisions={() => setShowStationDivisions(!showStationDivisions)}
              showAllTrainsFleet={showAllTrainsFleet}
              onToggleAllTrainsFleet={() => setShowAllTrainsFleet(!showAllTrainsFleet)}
              allTrainsCount={allTrainsLive.length}
            />
          </div>

          {/* Dedicated State Territory & Divisions Legend (Placed Separately!) */}
          {showTrainRoute && showStateDivisions && uniqueStatesOnRoute.length > 0 && (
            <StateLegendBar
              uniqueStatesOnRoute={uniqueStatesOnRoute}
              stateCrossings={stateCrossings}
              isVisible={true}
            />
          )}

          {/* Interactive Leaflet Railway Map Container with Dynamic Height */}
          <div className="min-h-[460px] h-[calc(100vh-280px)] max-h-[850px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <MapWrapper
              stops={stops}
              trainNumber={selectedTrainNumber}
              trainName={activeTrain?.train_name || 'Train'}
              simulationState={simulationState}
              isSimulating={isPlaying}
              onSelectStation={(code) => handleStationClick(code)}
              selectedStationCode={selectedStationCode}
              liveRailRadarData={liveRailRadarData}
              isLiveGpsMode={isLiveGpsMode}
              onToggleLiveGpsMode={() => setIsLiveGpsMode(!isLiveGpsMode)}
              stateCrossings={stateCrossings}
              routeDivisions={routeDivisions}
              allTrainsLive={allTrainsLive}
              isFullCanvas={false}
              onToggleFullCanvas={() => setIsFullCanvas(true)}
              showTrainRoute={showTrainRoute}
              onToggleShowTrainRoute={() => setShowTrainRoute(!showTrainRoute)}
              isFollowingTrain={isFollowingTrain}
              onToggleFollowTrain={() => setIsFollowingTrain(!isFollowingTrain)}
              showStateDivisions={showStateDivisions}
              onToggleShowStateDivisions={() => setShowStateDivisions(!showStateDivisions)}
              showStationDivisions={showStationDivisions}
              onToggleShowStationDivisions={() => setShowStationDivisions(!showStationDivisions)}
              showAllTrainsFleet={showAllTrainsFleet}
              onToggleShowAllTrainsFleet={() => setShowAllTrainsFleet(!showAllTrainsFleet)}
              fitRouteTrigger={fitRouteTrigger}
            />
          </div>
        </div>

        {/* Right Column: Stops Timeline */}
        <div className={`md:col-span-5 lg:col-span-5 xl:col-span-4 space-y-4 ${
          mobileTab === 'map' ? 'hidden md:block' : 'block'
        }`}>
          <StopsTimeline
            stops={stops}
            currentStopSequence={currentStopSeq}
            selectedStationCode={selectedStationCode}
            onSelectStation={(code) => handleStationClick(code)}
            onInjectDelay={handleInjectDelay}
            onResetDelays={handleResetDelays}
            attribution={attribution}
            isLiveGpsMode={isLiveGpsMode}
          />
        </div>
      </div>
    </main>
  );
}
