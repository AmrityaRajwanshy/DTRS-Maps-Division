import { NextRequest, NextResponse } from 'next/server';
import { getTrainRoute, getDelayEvents } from '@/lib/db';
import { calculatePropagatedETA } from '@/lib/eta-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = getTrainRoute(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: `Train ${id} not found in database.` },
        { status: 404 }
      );
    }

    const { train, stops } = result;
    const delayEvents = getDelayEvents(id);

    // Calculate dynamic ETA propagation
    const { predictions, attribution } = calculatePropagatedETA(stops, delayEvents, 2);

    // Build the format specified in Section 17
    const route = stops.map((stop, idx) => {
      const pred = predictions[idx];
      const isSource = idx === 0;
      const isDest = idx === stops.length - 1;

      return {
        stop_sequence: stop.stop_sequence,
        sequence: stop.stop_sequence,
        station_name: stop.station_name,
        station: stop.station_name,
        station_code: stop.station_code,
        code: stop.station_code,
        latitude: stop.latitude,
        lat: stop.latitude,
        longitude: stop.longitude,
        lng: stop.longitude,
        scheduled_arrival: stop.scheduled_arrival,
        scheduledArrival: isSource ? null : stop.scheduled_arrival,
        scheduled_departure: stop.scheduled_departure,
        scheduledDeparture: isDest ? null : stop.scheduled_departure,
        delay_minutes: pred ? pred.delay_minutes : (stop.delay_minutes || 0),
        delay: pred ? pred.delay_minutes : (stop.delay_minutes || 0),
        predicted_eta: pred ? pred.predicted_eta : (stop.predicted_eta || stop.scheduled_arrival),
        eta: pred ? pred.predicted_eta : (stop.predicted_eta || stop.scheduled_arrival),
        cause_description: pred ? pred.cause_description : (stop.cause_description || 'Operating per schedule'),
        cause: pred ? pred.cause_description : (stop.cause_description || 'Operating per schedule'),
        cause_type: pred ? pred.cause_type : 'ON_TIME',
        confidence: pred ? pred.confidence : 0.92,
        osm_id: stop.osm_id || `node/384${Math.abs(stop.station_code.charCodeAt(0) * 1000)}`,
        osm_type: stop.osm_type || 'node',
        halt_minutes: stop.halt_minutes || 2,
        distance_km: stop.distance_km,
        platform: stop.platform
      };
    });

    return NextResponse.json({
      success: true,
      train: {
        number: train.train_number,
        name: train.train_name,
        source: train.source_name || train.source_code,
        destination: train.destination_name || train.destination_code,
        corridor_id: train.corridor_id,
        duration: train.duration,
        scheduled_departure: train.scheduled_departure,
        scheduled_arrival: train.scheduled_arrival,
        verification_status: train.verification_status
      },
      route,
      // Also provide 'stops' for backwards compatibility
      stops: route.map(r => ({
        ...r,
        station_name: r.station,
        station_code: r.code,
        latitude: r.lat,
        longitude: r.lng,
        predicted_eta: r.eta,
        delay_minutes: r.delay,
        cause_description: r.cause,
        stop_sequence: r.sequence
      })),
      delay_attribution: attribution
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
