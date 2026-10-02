'use client';

import React from 'react';
import { Play, Pause, RotateCcw, Sliders, SkipBack, SkipForward } from 'lucide-react';

export interface SimulationControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onNextStation?: () => void;
  onPrevStation?: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  progressPercent: number;
  onSeek: (progress: number) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  onNextStation,
  onPrevStation,
  playbackSpeed,
  onChangeSpeed,
  progressPercent,
  onSeek
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
        {/* Live Simulation Status Indicator */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-wide uppercase">
              Simulation Mode
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-mono text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full font-bold">
            Real-Time Kinematics
          </span>
        </div>

        {/* Playback Controls & Speed Multipliers */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
          {/* Action Buttons Group */}
          <div className="flex items-center gap-1.5">
            {/* Station Stepper Controls */}
            {onPrevStation && (
              <button
                onClick={onPrevStation}
                title="Jump to Previous Station"
                aria-label="Previous Station"
                className="h-9 w-9 sm:h-8 sm:w-auto sm:px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-all flex items-center justify-center gap-1 text-xs cursor-pointer active:scale-95 font-semibold"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Prev</span>
              </button>
            )}

            {/* Play / Pause */}
            <button
              onClick={onTogglePlay}
              className={`h-9 px-3 sm:px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                isPlaying
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Sim</span>
                </>
              )}
            </button>

            {onNextStation && (
              <button
                onClick={onNextStation}
                title="Jump to Next Station"
                aria-label="Next Station"
                className="h-9 w-9 sm:h-8 sm:w-auto sm:px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-all flex items-center justify-center gap-1 text-xs cursor-pointer active:scale-95 font-semibold"
              >
                <span className="hidden sm:inline text-[11px]">Next</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Reset */}
            <button
              onClick={onReset}
              title="Reset Train to Start"
              aria-label="Reset Simulation"
              className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-all flex items-center justify-center cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Multipliers */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`h-7 px-2 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  playbackSpeed === s
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Route Progress Scrubber */}
      <div className="pt-2 border-t border-slate-200 flex items-center gap-2 sm:gap-3">
        <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 shrink-0" />
        <span className="text-[11px] sm:text-xs font-semibold text-slate-600 shrink-0">Scrub:</span>
        <input
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={progressPercent}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          aria-label="Scrub route progress"
          className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg touch-pan-x"
        />
        <span className="text-[11px] sm:text-xs font-mono font-bold text-sky-700 shrink-0 w-11 sm:w-12 text-right">
          {progressPercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};
