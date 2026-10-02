import { NextRequest, NextResponse } from 'next/server';
import { getTrainRoute } from '@/lib/db';
import { getAuthoritativeRailwayTrackGeometry } from '@/lib/osm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trainNumber = searchParams.get('train') || '12304';

    const result = getTrainRoute(trainNumber);
    if (!result) {
      return NextResponse.json(
        { success: false, error: `Train ${trainNumber} not found.` },
        { status: 404 }
      );
    }

    const trackCoordinates = getAuthoritativeRailwayTrackGeometry(result.stops);

    return NextResponse.json({
      success: true,
      train_number: trainNumber,
      track_type: 'OSM_RAILWAY_GEOMETRY',
      waypoints_count: trackCoordinates.length,
      coordinates: trackCoordinates
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
