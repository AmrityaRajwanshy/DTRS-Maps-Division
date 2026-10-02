import { NextRequest, NextResponse } from 'next/server';
import {
  getRouteDivisionsForTrain,
  getAllStateBorderDivisions,
  getTrackBorderCrossingsForTrain,
  getTrainRoute
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trainNumber = searchParams.get('train') || '12304';

    const route = getTrainRoute(trainNumber);
    const stops = route?.stops || [];

    const stationDivisions = getRouteDivisionsForTrain(trainNumber);
    const stateBorderCrossings = getTrackBorderCrossingsForTrain(trainNumber, stops);
    const allStateDivisions = getAllStateBorderDivisions();

    // Group stops by state territory
    const stateTerritories: Record<string, { state: string; borderKey: string; count: number; stations: string[] }> = {};
    for (const stop of stops) {
      const st = stop.state || 'Territory';
      const key = `SB-${st.slice(0, 2).toUpperCase()}`;
      if (!stateTerritories[st]) {
        stateTerritories[st] = { state: st, borderKey: key, count: 0, stations: [] };
      }
      stateTerritories[st].count += 1;
      stateTerritories[st].stations.push(stop.station_code);
    }

    return NextResponse.json({
      success: true,
      data: {
        train_number: trainNumber,
        total_station_divisions: stationDivisions.length || Math.max(0, stops.length - 1),
        total_state_border_crossings: stateBorderCrossings.length,
        station_divisions: stationDivisions,
        state_border_crossings: stateBorderCrossings,
        state_territories: Object.values(stateTerritories),
        all_state_divisions: allStateDivisions
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
