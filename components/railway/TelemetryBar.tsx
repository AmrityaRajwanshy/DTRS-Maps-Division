'use client';

import React from 'react';
import { Gauge, Activity, Clock, ArrowRight, Train as TrainIcon, Navigation, Compass, CheckCircle2 } from 'lucide-react';
import { SimulationState } from '@/lib/simulation';
import type { Train } from '@/lib/types';

export interface TelemetryBarProps {
  train: Train;
  simulationState: SimulationState | null;
  destinationEta: string;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  train,
  simulationState,
  destinationEta
}) => {
  // Robust data extraction with safe fallbacks
  const trainNumber = train.train_number || (train as any).number || '12304';
  const trainName = train.train_name || (train as any).name || 'Express';
  const sourceName = train.source_name || (train as any).source || train.source_code || 'Origin';
  const destName = train.destination_name || (train as any).destination || train.destination_code || 'Destination';
  const sourceCode = train.source_code || (simulationState?.current_station.code) || 'SRC';
  const destCode = train.destination_code || (simulationState?.next_station.code) || 'DST';
  const scheduledArrival = train.scheduled_arrival || (train as any).arrival_time || '--:--';
  const scheduledDeparture = train.scheduled_departure || (train as any).departure_time || '--:--';
  const duration = train.duration || '';

  const speed = simulationState ? simulationState.speed_kmh : 0;
  const progress = simulationState ? simulationState.progress_percent : 0;
  const nextStationName = simulationState?.next_station.name || destName;
  const nextStationCode = simulationState?.next_station.code || destCode;
  const currentStationName = simulationState?.current_station.name || sourceName;
  const currentStationCode = simulationState?.current_station.code || sourceCode;
  const distanceRemaining = simulationState?.distance_remaining_km !== undefined ? simulationState.distance_remaining_km : 0;
  const operationalMessage = simulationState?.operational_message || 'Operating on scheduled timetable';

  const isStopped = speed === 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm space-y-3 sm:space-y-4">
      {/* 2x2 on Mobile, 4x1 on Tablets & Desktop Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Card 1: Active Train & Dispatch Status */}
        <div className="bg-slate-50/80 hover:bg-[#172b54]/5 border border-slate-200 hover:border-[#172b54]/30 rounded-xl p-2.5 sm:p-3.5 transition-all flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3.5 shadow-xs">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#172b54]/10 border border-[#172b54]/20 text-[#172b54] flex items-center justify-center shrink-0 shadow-inner">
            <TrainIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#172b54]" />
          </div>
          <div className="min-w-0 flex-1 w-full">
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
              <span>Active Train</span>
              <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ON-TIME
              </span>
            </div>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1.5 truncate">
              <span className="text-sm sm:text-base font-black font-mono text-orange-600 tracking-tight">{trainNumber}</span>
              <span className="text-[11px] sm:text-xs font-semibold text-[#172b54] truncate" title={trainName}>{trainName}</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 truncate mt-0.5 font-mono">
              {sourceCode} -&gt; {destCode}
            </div>
          </div>
        </div>

        {/* Card 2: Current Velocity / Speedometer */}
        <div className="bg-slate-50/80 hover:bg-[#172b54]/5 border border-slate-200 hover:border-[#172b54]/30 rounded-xl p-2.5 sm:p-3.5 transition-all flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3.5 shadow-xs">
          <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border ${
            isStopped
              ? 'bg-amber-100 border-amber-300 text-amber-700'
              : 'bg-[#172b54]/10 border-[#172b54]/20 text-[#172b54]'
          }`}>
            <Gauge className={`w-4 h-4 sm:w-5 sm:h-5 ${!isStopped ? 'animate-pulse text-[#172b54]' : ''}`} />
          </div>
          <div className="min-w-0 flex-1 w-full">
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
              <span>Velocity</span>
              <span className="text-[8px] sm:text-[9px] text-slate-500 font-mono font-bold">MAX 130</span>
            </div>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
              <span className="text-lg sm:text-2xl font-black font-mono text-[#172b54] tracking-tight">{speed}</span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500">km/h</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-600 font-medium truncate mt-0.5 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isStopped ? 'bg-amber-500' : 'bg-orange-500 animate-ping'}`}></span>
              <span className="truncate">{isStopped ? 'Dwell / Halt' : 'Cruising'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Track Segment & Next Station */}
        <div className="bg-slate-50/80 hover:bg-[#172b54]/5 border border-slate-200 hover:border-[#172b54]/30 rounded-xl p-2.5 sm:p-3.5 transition-all flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3.5 shadow-xs">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#172b54]/10 border border-[#172b54]/20 text-[#172b54] flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-[#172b54]" />
          </div>
          <div className="min-w-0 flex-1 w-full">
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Next Stop
            </div>
            <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-1">
              <span className="truncate" title={nextStationName}>{nextStationName}</span>
              <span className="text-[9px] sm:text-[10px] font-mono px-1 py-0.2 rounded bg-[#172b54]/10 text-[#172b54] border border-[#172b54]/20 shrink-0 font-bold">
                {nextStationCode}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-600 font-mono mt-0.5 flex items-center gap-1 truncate">
              <span className="text-slate-500 truncate">{currentStationCode} -&gt; {nextStationCode}</span>
              <span className="text-slate-400">•</span>
              <span className="text-orange-600 font-bold shrink-0">{distanceRemaining}km</span>
            </div>
          </div>
        </div>

        {/* Card 4: Destination ETA & Timetable */}
        <div className="bg-slate-50/80 hover:bg-[#172b54]/5 border border-slate-200 hover:border-[#172b54]/30 rounded-xl p-2.5 sm:p-3.5 transition-all flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3.5 shadow-xs">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1 w-full">
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
              <span>Dest ETA</span>
              <span className="text-[8px] sm:text-[9px] text-slate-500 font-mono font-bold">TIMETABLE</span>
            </div>
            <div className="mt-0.5 sm:mt-1 flex items-baseline justify-between gap-1">
              <span className="text-lg sm:text-2xl font-black font-mono text-orange-600 tracking-tight">
                {destinationEta || scheduledArrival}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-mono line-through">
                {scheduledArrival}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-600 truncate mt-0.5 flex items-center justify-between">
              <span className="truncate">Terminus: <b className="text-slate-900 font-medium">{destName}</b></span>
              <span className="text-emerald-700 font-bold text-[9px] sm:text-[10px] ml-1 shrink-0">0m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Dynamic Progress & Live Kinematic Status */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-600 font-mono mb-2 gap-1.5 sm:gap-2">
          {/* Progress & Live Message */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <span className="text-slate-500 font-medium">Progress:</span>
              <span className="text-orange-600 font-bold font-mono">{progress.toFixed(1)}%</span>
            </div>

            {operationalMessage && (
              <span className="text-[10px] sm:text-[11px] text-slate-800 bg-[#172b54]/5 px-2 sm:px-2.5 py-0.5 rounded-full border border-[#172b54]/15 font-sans font-medium flex items-center gap-1.5 shadow-2xs max-w-[240px] sm:max-w-none truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0"></span>
                <span className="truncate">{operationalMessage}</span>
              </span>
            )}
          </div>

          {/* Terminus Endpoints */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-700 text-[11px] sm:text-xs font-semibold flex-wrap">
            <span className="text-slate-800 truncate max-w-[120px] sm:max-w-none">{sourceName}</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#172b54] shrink-0" />
            <span className="text-slate-900 truncate max-w-[120px] sm:max-w-none font-bold">{destName}</span>
            {duration && (
              <span className="text-[9px] sm:text-[10px] text-slate-600 font-mono ml-1 bg-slate-100 px-1.5 sm:px-2 py-0.2 rounded border border-slate-200 font-normal shrink-0">
                {duration}
              </span>
            )}
          </div>
        </div>

        {/* High-Definition Luminous Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
          <div
            className="bg-gradient-to-r from-[#172b54] via-[#1e3a70] to-orange-500 h-full rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${Math.min(100, Math.max(0.5, progress))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
