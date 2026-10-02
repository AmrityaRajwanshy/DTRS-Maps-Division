import { NextRequest, NextResponse } from 'next/server';
import { getTrainRoute, getTrainLiveState, updateTrainLiveTelemetry } from '@/lib/db';
import { interpolateTrainPosition } from '@/lib/simulation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainNumber = searchParams.get('train') || '12304';
  const progressParam = searchParams.get('progress');

  const routeData = getTrainRoute(trainNumber);
  if (!routeData || routeData.stops.length === 0) {
    return NextResponse.json(
      { success: false, error: `Train ${trainNumber} route not found.` },
      { status: 404 }
    );
  }

  // If a single progress calculation is requested:
  if (progressParam !== null) {
    const progress = parseFloat(progressParam);
    const simState = interpolateTrainPosition(routeData.stops, progress);

    // Optionally update live telemetry
    updateTrainLiveTelemetry(trainNumber, {
      latitude: simState.latitude,
      longitude: simState.longitude,
      current_station_code: simState.current_station.code,
      next_station_code: simState.next_station.code,
      speed_kmh: simState.speed_kmh,
      progress_percent: simState.progress_percent,
      bearing: simState.bearing,
      status: simState.status
    });

    return NextResponse.json({
      success: true,
      simulation: simState
    });
  }

  // Otherwise, establish SSE stream for live updates
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  let currentProgress = 25.0;
  const liveState = getTrainLiveState(trainNumber);
  if (liveState) {
    currentProgress = liveState.progress_percent;
  }

  const intervalId = setInterval(async () => {
    try {
      currentProgress += 0.25;
      if (currentProgress > 100) currentProgress = 0;

      const sim = interpolateTrainPosition(routeData.stops, currentProgress);
      const dataStr = `data: ${JSON.stringify(sim)}\n\n`;
      await writer.write(encoder.encode(dataStr));
    } catch {
      clearInterval(intervalId);
      writer.close().catch(() => {});
    }
  }, 1000);

  request.signal.addEventListener('abort', () => {
    clearInterval(intervalId);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
