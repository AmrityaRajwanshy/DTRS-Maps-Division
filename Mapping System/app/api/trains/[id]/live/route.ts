import { NextRequest, NextResponse } from 'next/server';
import { getTrainRoute, getTrainLiveState } from '@/lib/db';
import { fetchRailRadarLiveTelemetry } from '@/lib/railradar';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const route = getTrainRoute(id);
    const stops = route?.stops || [];

    // Attempt live RailRadar API location fetch with track-accurate coordinate snapping
    const liveTelemetry = await fetchRailRadarLiveTelemetry(id, stops);

    return NextResponse.json({
      success: true,
      is_live: liveTelemetry.isLive,
      source: liveTelemetry.source,
      data: {
        train_number: liveTelemetry.trainNumber,
        train_name: liveTelemetry.trainName,
        current_station: liveTelemetry.current_station_name,
        current_station_code: liveTelemetry.current_station_code,
        next_station: liveTelemetry.next_station_name,
        next_station_code: liveTelemetry.next_station_code,
        latitude: liveTelemetry.latitude,
        longitude: liveTelemetry.longitude,
        bearing: liveTelemetry.bearing,
        speed_kmh: liveTelemetry.speed_kmh,
        delay_minutes: liveTelemetry.delay_minutes,
        progress_percent: liveTelemetry.progress_percent,
        distance_from_origin_km: liveTelemetry.distance_from_origin_km,
        status: liveTelemetry.status,
        active_state: liveTelemetry.active_state,
        active_state_border_key: liveTelemetry.active_state_border_key,
        active_division_segment_id: liveTelemetry.active_division_segment_id,
        updated_at: liveTelemetry.last_updated_at
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
