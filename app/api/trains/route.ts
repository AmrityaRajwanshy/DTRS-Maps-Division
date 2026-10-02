import { NextRequest, NextResponse } from 'next/server';
import { getTrainsByCorridor } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const corridor = searchParams.get('corridor') || undefined;
    const trains = getTrainsByCorridor(corridor);
    return NextResponse.json({
      success: true,
      count: trains.length,
      data: trains
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
