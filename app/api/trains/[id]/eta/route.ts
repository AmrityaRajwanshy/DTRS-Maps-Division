import { NextRequest, NextResponse } from 'next/server';
import { getTrainRoute, getDelayEvents } from '@/lib/db';
import { calculatePropagatedETA } from '@/lib/eta-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const route = getTrainRoute(id);

    if (!route) {
      return NextResponse.json(
        { success: false, error: `Train ${id} not found.` },
        { status: 404 }
      );
    }

    const delayEvents = getDelayEvents(id);
    const { predictions, attribution } = calculatePropagatedETA(route.stops, delayEvents, 2);

    return NextResponse.json({
      success: true,
      train_number: id,
      train_name: route.train.train_name,
      predictions,
      delay_attribution: attribution,
      active_delay_events: delayEvents
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
