import { NextRequest, NextResponse } from 'next/server';
import { lookupStationOsm } from '@/lib/osm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('code');

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter q or code is required.' },
        { status: 400 }
      );
    }

    const result = await lookupStationOsm(query);

    if (!result) {
      return NextResponse.json(
        { success: false, error: `Station "${query}" could not be resolved from OSM or Database.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
