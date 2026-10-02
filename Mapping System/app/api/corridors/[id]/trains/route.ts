import { NextRequest, NextResponse } from 'next/server';
import { getTrainsByCorridor } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trains = getTrainsByCorridor(id);
    return NextResponse.json({
      success: true,
      corridor_id: id,
      data: trains
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
