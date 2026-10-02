'use client';

import React from 'react';
import { Flag, ArrowRightLeft } from 'lucide-react';
import type { TrackBorderCrossing } from '@/lib/types';

export interface StateLegendItem {
  state: string;
  key: string;
  color: string;
}

export interface StateLegendBarProps {
  uniqueStatesOnRoute: StateLegendItem[];
  stateCrossings?: TrackBorderCrossing[];
  isVisible?: boolean;
}

export const StateLegendBar: React.FC<StateLegendBarProps> = ({
  uniqueStatesOnRoute,
  stateCrossings = [],
  isVisible = true
}) => {
  if (!isVisible || uniqueStatesOnRoute.length === 0) return null;

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 overflow-x-auto no-scrollbar">
      {/* Left: Legend Title & State Color Badges */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0 pr-1 border-r border-slate-200">
          <Flag className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 uppercase tracking-wider whitespace-nowrap">
            State Territory:
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-nowrap">
          {uniqueStatesOnRoute.map((st) => (
            <span
              key={st.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold bg-slate-50 border shadow-2xs whitespace-nowrap shrink-0 transition-transform hover:scale-105"
              style={{ color: st.color, borderColor: `${st.color}55` }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0 shadow-xs"
                style={{ backgroundColor: st.color }}
              />
              <span className="text-slate-900">{st.state}</span>
              <span className="text-[9px] opacity-80 font-semibold" style={{ color: st.color }}>
                ({st.key.replace('SB-', '')})
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Right: Inter-State Transitions on Train's Route */}
      {stateCrossings.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse shrink-0" />
            <ArrowRightLeft className="w-3 h-3 text-purple-600" />
            <span>{stateCrossings.length} Inter-State Transition{stateCrossings.length > 1 ? 's' : ''}</span>
          </span>
        </div>
      )}
    </div>
  );
};
