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
  isLayerActive?: boolean;
  variant?: 'card' | 'compact';
  className?: string;
}

export const StateLegendBar: React.FC<StateLegendBarProps> = ({
  uniqueStatesOnRoute,
  stateCrossings = [],
  isVisible = true,
  isLayerActive = true,
  variant = 'card',
  className = ''
}) => {
  if (!isVisible || uniqueStatesOnRoute.length === 0) return null;

  // Compact bar for Full Canvas view header
  if (variant === 'compact') {
    return (
      <div className={`w-full bg-white border border-slate-200/90 rounded-lg px-3 py-1.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 overflow-x-auto no-scrollbar ${className}`}>
        <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0 pr-1.5 border-r border-slate-200">
            <span className="bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs flex items-center gap-1">
              <Flag className="w-2.5 h-2.5 text-white" />
              LEGEND
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 uppercase tracking-wider whitespace-nowrap">
              Territory:
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-nowrap">
            {uniqueStatesOnRoute.map((st) => (
              <span
                key={st.key}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono font-bold bg-slate-50 border shadow-2xs whitespace-nowrap shrink-0"
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

        {stateCrossings.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse shrink-0" />
              <ArrowRightLeft className="w-3 h-3 text-purple-600" />
              <span>{stateCrossings.length} Transitions</span>
            </span>
          </div>
        )}
      </div>
    );
  }

  // Cuboidal Card Variant (Placed beside the Corridor & Train Selector Card)
  return (
    <section className={`bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3.5 shadow-sm ring-1 ring-slate-100 flex flex-col space-y-2.5 ${className}`}>
      {/* Row 1: Header Marked with Prominent LEGEND Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs flex items-center gap-1">
            <Flag className="w-3 h-3 text-white" />
            LEGEND
          </span>
          <span className="text-xs uppercase font-bold text-slate-800 tracking-wider">
            State Territories:
          </span>
        </div>

        {stateCrossings.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs whitespace-nowrap self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse shrink-0" />
            <ArrowRightLeft className="w-3 h-3 text-purple-600" />
            <span>{stateCrossings.length} Inter-State Transitions</span>
          </span>
        )}
      </div>

      {/* Row 2: Cuboidal State Territory Badges */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5">
        {uniqueStatesOnRoute.map((st) => (
          <span
            key={st.key}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold bg-slate-50 border shadow-2xs whitespace-nowrap transition-transform hover:scale-105"
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
    </section>
  );
};
