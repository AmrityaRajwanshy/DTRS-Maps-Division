import { NextResponse } from 'next/server';
import { getTrainsByCorridor, getTrainRoute } from '@/lib/db';
import { fetchRailRadarLiveTelemetry, LiveRailRadarTelemetry } from '@/lib/railradar';

export async function GET() {
  try {
    const allTrains = getTrainsByCorridor();

    // Fetch live RailRadar telemetry for all seeded trains
    const telemetryPromises = allTrains.map(async (t) => {
      try {
        const route = getTrainRoute(t.train_number);
        const stops = route?.stops || [];
        return await fetchRailRadarLiveTelemetry(t.train_number, stops);
      } catch {
        return null;
      }
    });

    const results = (await Promise.all(telemetryPromises)).filter(Boolean) as LiveRailRadarTelemetry[];

    return NextResponse.json({
      success: true,
      count: results.length,
      timestamp: new Date().toISOString(),
      trains: results
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
