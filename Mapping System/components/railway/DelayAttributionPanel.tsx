'use client';

import React, { useState } from 'react';
import type { TrainStop, DelayEvent } from '@/lib/types';
import { DelayAttributionSummary } from '@/lib/eta-engine';
import { AlertTriangle, ShieldCheck, Sparkles, PlusCircle, Trash2, ArrowDownRight, Compass, CheckCircle2 } from 'lucide-react';

export interface DelayAttributionPanelProps {
  trainNumber: string;
  stops: TrainStop[];
  attribution: DelayAttributionSummary | null;
  activeEvents: DelayEvent[];
  onInjectDelay: (stationCode: string, minutes: number, causeType: string, description: string) => Promise<void>;
  onResetDelays: () => Promise<void>;
}

export const DelayAttributionPanel: React.FC<DelayAttributionPanelProps> = ({
  trainNumber,
  stops,
  attribution,
  activeEvents,
  onInjectDelay,
  onResetDelays
}) => {
  const [selectedStation, setSelectedStation] = useState<string>(stops[1]?.station_code || 'CNB');
  const [delayMinutes, setDelayMinutes] = useState<number>(7);
  const [causeType, setCauseType] = useState<string>('PRECEDING_TRAIN');
  const [description, setDescription] = useState<string>('Preceding train congestion on outer junction lead');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleInject = async () => {
    setIsSubmitting(true);
    try {
      await onInjectDelay(selectedStation, delayMinutes, causeType, description);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHeroScenario = async () => {
    setIsSubmitting(true);
    try {
      await onInjectDelay(
        'CNB',
        7,
        'PRECEDING_TRAIN',
        'Preceding freight train congestion at Kanpur Central outer junction'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
              SIH 26028 Dynamic Delay & ETA Attribution Engine
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Attributing root cause, buffer absorption, and propagation across downstream stops
          </p>
        </div>

        {/* 1-Click Hero Scenario for Judges */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleHeroScenario}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1.5 border border-amber-400 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Judge Demo: +7m at Kanpur</span>
          </button>

          {activeEvents.length > 0 && (
            <button
              onClick={onResetDelays}
              disabled={isSubmitting}
              title="Reset All Delays"
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Attribution Summary Banner */}
      {attribution && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-500">Primary Cause Station</div>
              <div className="font-bold text-amber-700 text-sm mt-0.5">{attribution.primary_cause_station}</div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-500">Factor Classification</div>
              <div className="font-bold text-sky-700 text-sm mt-0.5">{attribution.primary_cause_type}</div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-500">Injected / Recovered</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5 font-mono">
                +{attribution.total_delay_minutes}m / -{attribution.recovered_minutes}m
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-500">Net Destination Delay</div>
              <div className="font-bold text-rose-600 text-sm mt-0.5 font-mono">
                +{attribution.net_destination_delay_minutes}m
              </div>
            </div>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 text-xs flex items-start gap-2">
            <Compass className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sky-900">Operational AI Dispatch Recommendation: </span>
              <span className="text-slate-700 font-medium">{attribution.recommendation}</span>
            </div>
          </div>
        </div>
      )}

      {/* Manual Delay Injection Console */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <PlusCircle className="w-3.5 h-3.5 text-sky-600" />
          <span>Interactive Delay Injection Console</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Station Selection */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Station
            </label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
            >
              {stops.map((s, idx) => (
                <option key={`${s.station_code}-${s.stop_sequence}-${idx}`} value={s.station_code}>
                  #{s.stop_sequence} {s.station_name} ({s.station_code})
                </option>
              ))}
            </select>
          </div>

          {/* Delay Minutes */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Delay: {delayMinutes} Minutes
            </label>
            <input
              type="range"
              min="1"
              max="45"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value))}
              className="w-full accent-sky-600 h-1.5 bg-slate-200 rounded-lg mt-2 cursor-pointer"
            />
          </div>

          {/* Cause Type */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Cause Factor
            </label>
            <select
              value={causeType}
              onChange={(e) => {
                setCauseType(e.target.value);
                if (e.target.value === 'SIGNAL_HALT') setDescription('Auto-signaling red aspect halt at block boundary');
                else if (e.target.value === 'PRECEDING_TRAIN') setDescription('Preceding express train clearance delay');
                else if (e.target.value === 'CONGESTION') setDescription('Platform line occupancy conflict');
                else if (e.target.value === 'MAINTENANCE_BLOCK') setDescription('Overhead catenary inspection speed restriction');
                else if (e.target.value === 'WEATHER') setDescription('Dense fog cautious running protocol');
              }}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
            >
              <option value="PRECEDING_TRAIN">PRECEDING_TRAIN</option>
              <option value="SIGNAL_HALT">SIGNAL_HALT</option>
              <option value="CONGESTION">CONGESTION</option>
              <option value="MAINTENANCE_BLOCK">MAINTENANCE_BLOCK</option>
              <option value="WEATHER">WEATHER</option>
              <option value="UNSCHEDULED_STOP">UNSCHEDULED_STOP</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Operational cause description..."
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
          />

          <button
            onClick={handleInject}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow transition-all shrink-0 flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Apply Delay & Recalculate</span>
          </button>
        </div>
      </div>

      {/* Downstream Propagation Table */}
      {attribution && attribution.breakdown.length > 0 && (
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
            Downstream Delay Propagation & Buffer Recovery Breakdown
          </label>
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Station</th>
                  <th className="py-2.5 px-2 text-center">Delay Added</th>
                  <th className="py-2.5 px-2 text-center">Buffer Recovered</th>
                  <th className="py-2.5 px-2 text-center">Cumulative Delay</th>
                  <th className="py-2.5 px-3">Reason / Propagation State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-mono">
                {attribution.breakdown.map((row, idx) => {
                  const hasAdded = row.delay_added > 0;
                  const hasRecovered = row.delay_absorbed > 0;
                  const isDelayed = row.cumulative_delay > 0;

                  return (
                    <tr key={`${row.station_code}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-slate-900">
                        {row.station_name} ({row.station_code})
                      </td>
                      <td className="py-2 px-2 text-center">
                        {hasAdded ? (
                          <span className="text-amber-600 font-bold">+{row.delay_added}m</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {hasRecovered ? (
                          <span className="text-emerald-600 font-bold">-{row.delay_absorbed}m</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-bold">
                        <span className={isDelayed ? 'text-amber-600' : 'text-emerald-600'}>
                          +{row.cumulative_delay}m
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans text-[11px] text-slate-600 truncate max-w-xs">
                        {row.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
