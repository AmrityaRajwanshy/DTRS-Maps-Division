'use client';

import React, { useState } from 'react';
import type { TrainStop, DelayAttributionSummary } from '@/lib/types';
import {
  Clock,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  PlusCircle,
  X
} from 'lucide-react';

export interface StopsTimelineProps {
  stops: TrainStop[];
  currentStopSequence: number;
  selectedStationCode: string | null;
  onSelectStation: (stationCode: string) => void;
  onInjectDelay?: (stationCode: string, minutes: number, causeType: string, description: string) => Promise<void>;
  onResetDelays?: () => Promise<void>;
  attribution?: DelayAttributionSummary | null;
  isLiveGpsMode?: boolean;
}

export const StopsTimeline: React.FC<StopsTimelineProps> = ({
  stops,
  currentStopSequence,
  selectedStationCode,
  onSelectStation,
  onInjectDelay,
  onResetDelays,
  attribution,
  isLiveGpsMode = false
}) => {
  const [showDelayTool, setShowDelayTool] = useState<boolean>(false);
  const [targetStation, setTargetStation] = useState<string>(stops[1]?.station_code || 'CNB');
  const [injectMins, setInjectMins] = useState<number>(7);
  const [causeType, setCauseType] = useState<string>('PRECEDING_TRAIN');
  const [causeDesc, setCauseDesc] = useState<string>('Preceding train congestion on outer junction lead');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const delayedStops = stops.filter(s => (s.delay_minutes || 0) > 0);
  const delayedCount = delayedStops.length;

  const handleApplyCustomDelay = async () => {
    if (!onInjectDelay) return;
    setIsSubmitting(true);
    try {
      await onInjectDelay(targetStation, injectMins, causeType, causeDesc);
      setShowDelayTool(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async () => {
    if (!onInjectDelay) return;
    setIsSubmitting(true);
    try {
      const demoStn = stops[1]?.station_code || 'CNB';
      await onInjectDelay(demoStn, 7, 'PRECEDING_TRAIN', 'Kanpur Central outer junction clearance delay');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-[#172b54] shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-[#172b54] tracking-wide uppercase">
            Stoppages ({stops.length} Stations)
          </h3>
          {delayedCount > 0 ? (
            <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
              {delayedCount} Delayed
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              All On-Time
            </span>
          )}
        </div>

        {/* Quick Delay Simulation Action Bar */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {onInjectDelay && (
            <button
              onClick={handleQuickDemo}
              disabled={isSubmitting}
              title="Simulate +7m delay at Kanpur Central to test dynamic ETA propagation"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3 fill-current" />
              <span>+7m Delay Demo</span>
            </button>
          )}

          {onInjectDelay && (
            <button
              onClick={() => setShowDelayTool(!showDelayTool)}
              title="Toggle Custom Delay Simulator"
              className={`p-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                showDelayTool
                  ? 'bg-[#172b54] text-white border-[#172b54]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          )}

          {delayedCount > 0 && onResetDelays && (
            <button
              onClick={onResetDelays}
              disabled={isSubmitting}
              title="Clear all delays and reset to timetable"
              className="p-1.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Delay Injection Tool */}
      {showDelayTool && onInjectDelay && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <PlusCircle className="w-3.5 h-3.5 text-sky-600" />
              Simulate Delay on Station
            </span>
            <button
              onClick={() => setShowDelayTool(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Station</label>
              <select
                value={targetStation}
                onChange={(e) => setTargetStation(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-[11px] font-medium"
              >
                {stops.map((s, i) => (
                  <option key={`${s.station_code}-${i}`} value={s.station_code}>
                    #{s.stop_sequence} {s.station_name} ({s.station_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                Delay: {injectMins} mins
              </label>
              <input
                type="range"
                min="1"
                max="45"
                value={injectMins}
                onChange={(e) => setInjectMins(parseInt(e.target.value))}
                className="w-full accent-sky-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Cause Factor</label>
              <select
                value={causeType}
                onChange={(e) => {
                  setCauseType(e.target.value);
                  if (e.target.value === 'PRECEDING_TRAIN') setCauseDesc('Preceding express clearance delay');
                  else if (e.target.value === 'SIGNAL_HALT') setCauseDesc('Auto-signaling red aspect halt');
                  else if (e.target.value === 'CONGESTION') setCauseDesc('Platform line occupancy conflict');
                  else if (e.target.value === 'WEATHER') setCauseDesc('Dense fog cautious speed');
                }}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-[11px] font-medium"
              >
                <option value="PRECEDING_TRAIN">PRECEDING_TRAIN</option>
                <option value="SIGNAL_HALT">SIGNAL_HALT</option>
                <option value="CONGESTION">CONGESTION</option>
                <option value="WEATHER">WEATHER</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={causeDesc}
              onChange={(e) => setCauseDesc(e.target.value)}
              placeholder="Operational description..."
              className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-800"
            />
            <button
              onClick={handleApplyCustomDelay}
              disabled={isSubmitting}
              className="px-3 py-1 bg-[#172b54] hover:bg-[#101e3d] text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer"
            >
              Apply Delay
            </button>
          </div>
        </div>
      )}

      {/* Station List with Explicit Delay & ETA */}
      <div className="space-y-2 max-h-[440px] sm:max-h-[500px] md:max-h-[600px] lg:max-h-[680px] overflow-y-auto pr-1">
        {stops.map((stop, idx) => {
          const stationCode = stop.station_code || (stop as any).code || '';
          const stationName = stop.station_name || (stop as any).station || '';
          const sequence = stop.stop_sequence ?? (stop as any).sequence ?? (idx + 1);

          const isSource = idx === 0;
          const isDestination = idx === stops.length - 1;
          const isCurrent = sequence === currentStopSequence;
          const isPassed = sequence < currentStopSequence;
          const isSelected = stationCode === selectedStationCode;
          const delayMinutes = stop.delay_minutes ?? 0;
          const isDelayed = delayMinutes > 0;
          const scheduledTime = stop.scheduled_arrival || stop.scheduled_departure || '--:--';
          const etaTime = stop.predicted_eta || scheduledTime;

          return (
            <div
              key={`${stationCode}-${sequence}-${idx}`}
              onClick={() => onSelectStation(stationCode)}
              className={`p-3 rounded-xl border transition-all cursor-pointer active:scale-[0.99] ${
                isSelected
                  ? 'bg-[#172b54]/5 border-[#172b54] shadow-sm ring-2 ring-[#172b54]/40'
                  : 'bg-white hover:bg-slate-50/90 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                {/* Station Node & Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                      isSource
                        ? 'bg-emerald-600 text-white'
                        : isDestination
                        ? 'bg-rose-600 text-white'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                        : isPassed
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-[#172b54]/10 text-[#172b54] border border-[#172b54]/25'
                    }`}
                  >
                    {sequence}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate" title={stationName}>
                        {stationName}
                      </span>
                      <span className="text-[10px] text-[#172b54] font-mono font-bold bg-[#172b54]/10 px-1.5 py-0.2 rounded border border-[#172b54]/20 shrink-0">
                        {stationCode}
                      </span>
                      {isSource && (
                        <span className="text-[8px] sm:text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 shrink-0 uppercase">
                          Origin
                        </span>
                      )}
                      {isDestination && (
                        <span className="text-[8px] sm:text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300 shrink-0 uppercase">
                          Destination
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[8px] sm:text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 shrink-0 uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Train Location
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                      <span>PF #{stop.platform || '1'}</span>
                      <span>• {stop.distance_km} km</span>
                      {stop.state && <span>• {stop.state}</span>}
                    </div>
                  </div>
                </div>

                {/* Explicit Sched, ETA & Delay Badge based upon station */}
                <div className="flex flex-col items-end justify-center shrink-0 min-w-[130px] sm:min-w-[155px]">
                  {/* Row 1: Sched and ETA */}
                  <div className="flex items-center gap-2 text-right">
                    <div className="text-[10px] font-mono text-slate-400">
                      <span className="uppercase text-[9px] font-semibold mr-1">Sched:</span>
                      <span>{scheduledTime}</span>
                    </div>
                    <div className="text-xs sm:text-sm font-mono font-bold flex items-center gap-1">
                      <span className="uppercase text-[9px] font-bold text-orange-600">ETA:</span>
                      <span className={isDelayed ? 'text-orange-700 font-extrabold' : 'text-orange-600 font-bold'}>
                        {etaTime}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Delay Status Badge */}
                  <div className="mt-1 flex items-center gap-1">
                    {isPassed ? (
                      <span className="text-[9px] sm:text-[10px] font-medium font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Departed {isDelayed ? `(+${delayMinutes}m)` : '(On-time)'}
                      </span>
                    ) : isDelayed ? (
                      <span className="text-[9px] sm:text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-300 flex items-center gap-1 shadow-xs">
                        <AlertTriangle className="w-3 h-3 text-orange-600" />
                        Delay: +{delayMinutes}m
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
                        Delay: 0m (On-Time)
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-0.5 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Station Delay Reason & Buffer Recovery Notification */}
              {isDelayed && stop.cause_description && !isPassed && (
                <div className="mt-2 pt-1.5 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-amber-900 bg-amber-50/70 rounded-md px-2 py-1">
                  <span className="truncate max-w-[220px] sm:max-w-xs font-medium">
                    Factor: {stop.cause_description}
                  </span>
                  {stop.confidence && (
                    <span className="font-mono text-amber-700 shrink-0 font-bold ml-1">
                      {Math.round(stop.confidence * 100)}% Conf
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
