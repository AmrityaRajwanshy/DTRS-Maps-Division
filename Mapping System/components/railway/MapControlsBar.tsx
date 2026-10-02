'use client';

import React from 'react';
import {
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  Layers,
  Flag,
  Globe,
  Route
} from 'lucide-react';

export interface MapControlsBarProps {
  isFullCanvas: boolean;
  onToggleFullCanvas: () => void;
  showTrainRoute: boolean;
  onToggleTrainRoute: () => void;
  onFitRoute: () => void;
  isFollowingTrain: boolean;
  onToggleFollowTrain: () => void;
  isLiveGpsMode: boolean;
  onToggleLiveGpsMode?: () => void;
  showStateDivisions: boolean;
  onToggleStateDivisions: () => void;
  showStationDivisions: boolean;
  onToggleStationDivisions: () => void;
  showAllTrainsFleet: boolean;
  onToggleAllTrainsFleet: () => void;
  allTrainsCount?: number;
}

export const MapControlsBar: React.FC<MapControlsBarProps> = ({
  isFullCanvas,
  onToggleFullCanvas,
  showTrainRoute,
  onToggleTrainRoute,
  onFitRoute,
  isFollowingTrain,
  onToggleFollowTrain,
  isLiveGpsMode,
  onToggleLiveGpsMode,
  showStateDivisions,
  onToggleStateDivisions,
  showStationDivisions,
  onToggleStationDivisions,
  showAllTrainsFleet,
  onToggleAllTrainsFleet,
  allTrainsCount = 14
}) => {
  return (
    <div className="w-full flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
        {/* Full Canvas / Split View Toggle */}
        <button
          onClick={onToggleFullCanvas}
          title={isFullCanvas ? "Exit Full Canvas (Switch to Split Dashboard)" : "Utilise Whole Canvas (Full Screen Map)"}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
            isFullCanvas
              ? 'bg-[#172b54] hover:bg-[#101e3d] text-white border-[#172b54] shadow-[#172b54]/25'
              : 'bg-[#172b54] hover:bg-[#101e3d] text-white border-[#172b54] shadow-[#172b54]/20'
          }`}
        >
          {isFullCanvas ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-orange-400" />
              <span>Split View</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-orange-400" />
              <span>Full Canvas</span>
            </>
          )}
        </button>

        {/* Train & Route Visibility Toggle */}
        <button
          onClick={onToggleTrainRoute}
          title={showTrainRoute ? "Hide Active Train & Route from Map" : "Show Selected Train & Route on Map"}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
            showTrainRoute
              ? 'bg-[#172b54] hover:bg-[#101e3d] text-white border-[#172b54] ring-1 ring-[#172b54]/40'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
          }`}
        >
          <Route className={`w-3.5 h-3.5 ${showTrainRoute ? 'text-orange-400' : 'text-[#172b54]'}`} />
          <span>Train &amp; Route</span>
        </button>

        {/* Fit Route */}
        <button
          onClick={onFitRoute}
          title="Fit Route to View"
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 whitespace-nowrap shadow-xs"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#172b54]" />
          <span>Fit Route</span>
        </button>

        {/* Follow Train */}
        <button
          onClick={onToggleFollowTrain}
          title="Keep map camera centered on train"
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold border cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
            isFollowingTrain
              ? 'bg-[#172b54] hover:bg-[#101e3d] text-white border-[#172b54] ring-1 ring-[#172b54]/40'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
          }`}
        >
          <Navigation className={`w-3.5 h-3.5 ${isFollowingTrain ? 'text-orange-400' : 'text-[#172b54]'}`} />
          <span>{isFollowingTrain ? 'Tracking' : 'Track'}</span>
        </button>

        {/* Live RailRadar GPS Toggle */}
        {onToggleLiveGpsMode && (
          <button
            onClick={onToggleLiveGpsMode}
            title="Toggle between Live GPS positioning and Kinematic Simulation"
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
              isLiveGpsMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 ring-1 ring-emerald-300'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveGpsMode ? 'text-white animate-pulse' : 'text-emerald-600'}`} />
            <span>{isLiveGpsMode ? 'LIVE GPS' : 'Sim Mode'}</span>
          </button>
        )}

        {/* State Divisions Layer Toggle */}
        <button
          onClick={onToggleStateDivisions}
          title="Toggle Inter-State Route Transitions & Territorial Divisions"
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold border cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
            showStateDivisions
              ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 ring-1 ring-purple-300'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <Flag className={`w-3.5 h-3.5 ${showStateDivisions ? 'text-white' : 'text-purple-600'}`} />
          <span>States</span>
        </button>

        {/* Station Block Segments Layer Toggle */}
        <button
          onClick={onToggleStationDivisions}
          title="Toggle Station-to-Station Block Division Segments (TRETA TS IDs)"
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold border cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
            showStationDivisions
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 ring-1 ring-indigo-300'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <Layers className={`w-3.5 h-3.5 ${showStationDivisions ? 'text-white' : 'text-indigo-600'}`} />
          <span>Blocks</span>
        </button>

        {/* All Trains Fleet Layer Toggle */}
        <button
          onClick={onToggleAllTrainsFleet}
          title="View all premier trains live on Indian map"
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold border cursor-pointer active:scale-95 whitespace-nowrap shadow-xs ${
            showAllTrainsFleet
              ? 'bg-[#172b54] hover:bg-[#101e3d] text-white border-[#172b54]'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <Globe className={`w-3.5 h-3.5 ${showAllTrainsFleet ? 'text-white' : 'text-[#172b54]'}`} />
          <span>All Trains ({allTrainsCount})</span>
        </button>
      </div>
    </div>
  );
};
