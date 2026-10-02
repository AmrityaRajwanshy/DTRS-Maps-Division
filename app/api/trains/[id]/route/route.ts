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

    // Calculate dynamic ETA propagation based on recorded delay events
    const { predictions, attribution } = calculatePropagatedETA(stops, delayEvents, 2);

    // Merge calculated ETA predictions into stops
    const enrichedStops = stops.map((stop, idx) => {
      const pred = predictions[idx];
      return {
        id: stop.id,
        train_number: stop.train_number,
        stop_sequence: stop.stop_sequence,
        sequence: stop.stop_sequence,
        station_code: stop.station_code,
        code: stop.station_code,
        station_name: stop.station_name,
        station: stop.station_name,
        latitude: stop.latitude,
        lat: stop.latitude,
        longitude: stop.longitude,
        lng: stop.longitude,
        state: stop.state,
        zone: stop.zone,
        osm_id: stop.osm_id || '',
        osm_type: stop.osm_type || 'node',
        halt_minutes: stop.halt_minutes || 2,
        scheduled_arrival: stop.scheduled_arrival,
        scheduled_departure: stop.scheduled_departure,
        distance_km: stop.distance_km,
        day_number: stop.day_number,
        platform: stop.platform,
        predicted_eta: pred ? pred.predicted_eta : stop.scheduled_arrival,
        delay_minutes: pred ? pred.delay_minutes : 0,
        cause_type: pred ? pred.cause_type : 'ON_TIME',
        cause_description: pred ? pred.cause_description : 'Operating per schedule',
        confidence: pred ? pred.confidence : 0.92,
        is_delayed: pred ? pred.is_delayed : false,
        status: pred ? pred.status : 'UPCOMING'
      };
    });

    return NextResponse.json({
      success: true,
      train: {
        train_number: train.train_number,
        train_name: train.train_name,
        number: train.train_number,
        name: train.train_name,
        corridor_id: train.corridor_id,
        corridor_name: train.corridor_name,
        source: train.source_name,
        source_name: train.source_name,
        source_code: train.source_code,
        destination: train.destination_name,
        destination_name: train.destination_name,
        destination_code: train.destination_code,
        duration: train.duration,
        scheduled_departure: train.scheduled_departure,
        departure_time: train.scheduled_departure,
        scheduled_arrival: train.scheduled_arrival,
        arrival_time: train.scheduled_arrival,
        verification_status: train.verification_status
      },
      stops: enrichedStops,
      active_delays_count: delayEvents.length,
      delay_attribution: attribution
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
