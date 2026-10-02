'use client';

import React from 'react';
import { Clock, AlertTriangle, ShieldCheck, MapPin, Compass } from 'lucide-react';

export interface StationPopupProps {
  sequence: number;
  code: string;
  name: string;
  state?: string;
  zone?: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  predictedEta: string;
  delayMinutes: number;
  causeType: string;
  causeDescription: string;
  confidence: number;
  platform?: string;
  distanceKm?: number;
  isSource?: boolean;
  isDestination?: boolean;
}

export const StationPopup: React.FC<StationPopupProps> = ({
  sequence,
  code,
  name,
  state,
  zone,
  scheduledArrival,
  scheduledDeparture,
  predictedEta,
  delayMinutes,
  causeType,
  causeDescription,
  confidence,
  platform = '1',
  distanceKm = 0,
  isSource = false,
  isDestination = false
}) => {
  const isDelayed = delayMinutes > 0;

  return (
    <div className="w-[260px] sm:w-72 max-w-[85vw] bg-white/98 text-slate-900 rounded-xl p-3 sm:p-4 shadow-xl border border-slate-200/90 font-sans backdrop-blur-md">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-2.5 mb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base text-slate-900 tracking-wide">{name}</span>
            <span className="bg-sky-50 text-sky-700 font-mono text-xs px-1.5 py-0.5 rounded border border-sky-200 font-bold">
              {code}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
            <span>Stop #{sequence}</span>
            {zone && <span>• {zone} Zone</span>}
            {distanceKm > 0 && <span>• {distanceKm} km</span>}
          </div>
        </div>
        {isSource && (
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 uppercase">
            Source
          </span>
        )}
        {isDestination && (
          <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-300 uppercase">
            Destination
          </span>
        )}
      </div>

      {/* Schedule Grid */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-200/80 text-xs">
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Scheduled Arr</div>
          <div className="font-mono font-bold text-slate-800 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-600" />
            {scheduledArrival || '--:--'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Scheduled Dep</div>
          <div className="font-mono font-bold text-slate-800 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-600" />
            {scheduledDeparture || '--:--'}
          </div>
        </div>
      </div>

      {/* Delay & Prediction Section */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 font-medium">Current Delay:</span>
          {isDelayed ? (
            <span className="bg-amber-50 text-amber-800 font-mono font-bold px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1 shadow-sm">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              +{delayMinutes.toString().padStart(2, '0')} min
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded border border-emerald-300 shadow-sm">
              On-Time (00 min)
            </span>
          )}
        </div>

        {isDelayed && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-900">
            <div className="font-bold text-amber-800 flex items-center gap-1 mb-0.5">
              <span className="uppercase tracking-wider text-[9px]">Delay Factor:</span>
              <span>{causeType.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-slate-600 text-[10px] leading-tight">{causeDescription}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-slate-700 font-semibold">Predicted ETA:</span>
          <span className={`font-mono font-bold text-sm ${isDelayed ? 'text-amber-700' : 'text-emerald-700'}`}>
            {predictedEta || scheduledArrival}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            ETA Confidence:
          </span>
          <span className="font-mono font-semibold text-slate-800">{Math.round(confidence * 100)}%</span>
        </div>
      </div>

      {/* Platform Footer */}
      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] flex justify-between items-center text-slate-500 font-medium">
        <span>Platform #{platform}</span>
        <span className="text-sky-700 font-semibold flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-sky-600" /> Live Tracking Active
        </span>
      </div>
    </div>
  );
};
