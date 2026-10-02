import { NextRequest, NextResponse } from 'next/server';
import { addDelayEvent, getDelayEvents, getTrainRoute, getDatabase, updateTrainLiveTelemetry } from '@/lib/db';
import { calculatePropagatedETA } from '@/lib/eta-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      station_code,
      delay_minutes = 7,
      cause_type = 'PRECEDING_TRAIN',
      cause_description = 'Preceding train congestion on outer junction',
      confidence = 0.91,
      reset_previous = false
    } = body;

    const route = getTrainRoute(id);
    if (!route) {
      return NextResponse.json({ success: false, error: `Train ${id} not found.` }, { status: 404 });
    }

    const db = getDatabase();

    if (reset_previous) {
      db.prepare('DELETE FROM delay_events WHERE train_number = ?').run(id);
    }

    if (station_code) {
      addDelayEvent(id, station_code, Number(delay_minutes), cause_type, cause_description, Number(confidence));
    }

    // Recalculate cascade
    const updatedEvents = getDelayEvents(id);
    const { predictions, attribution } = calculatePropagatedETA(route.stops, updatedEvents, 2);

    // Update live state delay
    const totalDelay = attribution.total_delay_minutes;
    updateTrainLiveTelemetry(id, {
      delay_minutes: totalDelay,
      delay_reason: attribution.primary_cause_description
    });

    return NextResponse.json({
      success: true,
      message: `Delay event successfully registered for train ${id}.`,
      active_events: updatedEvents,
      predictions,
      attribution
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    db.prepare('DELETE FROM delay_events WHERE train_number = ?').run(id);

    // Reset train live state delay
    updateTrainLiveTelemetry(id, {
      delay_minutes: 0,
      delay_reason: 'Operating on scheduled timetable'
    });

    const route = getTrainRoute(id);
    const { predictions, attribution } = calculatePropagatedETA(route?.stops || [], [], 2);

    return NextResponse.json({
      success: true,
      message: `All simulated delays cleared for train ${id}.`,
      predictions,
      attribution
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
