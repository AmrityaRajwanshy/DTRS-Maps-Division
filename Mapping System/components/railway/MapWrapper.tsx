'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { RailwayMapProps } from './RailwayMap';
import { Loader2 } from 'lucide-react';

const DynamicRailwayMap = dynamic(
  () => import('./RailwayMap').then(mod => mod.RailwayMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[540px] rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-700 gap-3 shadow-inner">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <span className="text-sm font-semibold tracking-wide text-slate-800">Initializing GIS Railway Map Engine...</span>
      </div>
    )
  }
);

export const MapWrapper: React.FC<RailwayMapProps> = (props) => {
  return <DynamicRailwayMap {...props} />;
};
