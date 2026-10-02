'use client';

import React from 'react';
import type { Corridor, Train } from '@/lib/types';
import { Train as TrainIcon, Navigation, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export interface TrainSelectorProps {
  corridors: Corridor[];
  trains: Train[];
  selectedCorridorId: string;
  selectedTrainNumber: string;
  onSelectCorridor: (id: string) => void;
  onSelectTrain: (trainNumber: string) => void;
}

export const TrainSelector: React.FC<TrainSelectorProps> = ({
  corridors,
  trains,
  selectedCorridorId,
  selectedTrainNumber,
  onSelectCorridor,
  onSelectTrain
}) => {
  const filteredTrains = trains.filter(t => !selectedCorridorId || t.corridor_id === selectedCorridorId);
  const selectedTrain = trains.find(t => t.train_number === selectedTrainNumber);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Top Banner with Hero CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-100 border border-sky-200 text-sky-700">
            <TrainIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">Corridor & Train Dispatcher</h2>
            <p className="text-xs text-slate-500">Database-driven route resolution for SIH 26028 prototype</p>
          </div>
        </div>

        {/* Quick Hero Select Button */}
        <button
          onClick={() => {
            onSelectCorridor('delhi-howrah');
            onSelectTrain('12304');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
            selectedTrainNumber === '12304'
              ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Quick Hero: 12304 Poorva Express</span>
        </button>
      </div>

      {/* Corridor Pills */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
          Select Railway Corridor ({corridors.length})
        </label>
        <div className="flex flex-wrap gap-1.5">
          {corridors.map(c => {
            const isSelected = c.id === selectedCorridorId;
            return (
              <button
                key={c.id}
                onClick={() => {
                  onSelectCorridor(c.id);
                  // Auto-select first train in corridor
                  const corridorTrains = trains.filter(t => t.corridor_id === c.id);
                  if (corridorTrains.length > 0 && corridorTrains[0].train_number !== selectedTrainNumber) {
                    onSelectTrain(corridorTrains[0].train_number);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-500/20 ring-1 ring-sky-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Train Selector Dropdown & Meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Active Train ({filteredTrains.length} Available)
          </label>
          <select
            value={selectedTrainNumber}
            onChange={(e) => onSelectTrain(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-2xs"
          >
            {filteredTrains.map(t => (
              <option key={t.train_number} value={t.train_number} className="bg-white text-slate-900 py-1">
                {t.train_number} — {t.train_name} ({t.source_name} to {t.destination_name})
              </option>
            ))}
          </select>
        </div>

        {/* Selected Train Metadata Card */}
        {selectedTrain && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-sky-600" />
                <span>{selectedTrain.source_name} to {selectedTrain.destination_name}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                <span>Dep: <b className="text-slate-800">{selectedTrain.scheduled_departure}</b></span>
                <span>• Arr: <b className="text-slate-800">{selectedTrain.scheduled_arrival}</b></span>
                <span>• Time: <b className="text-slate-800">{selectedTrain.duration}</b></span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              {selectedTrain.verification_status === 'PARTIALLY_VERIFIED' ? (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified NTES
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Prototype Seed
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
