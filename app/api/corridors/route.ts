import { NextResponse } from 'next/server';
import { getAllCorridors } from '@/lib/db';

export async function GET() {
  try {
    const corridors = getAllCorridors();
    return NextResponse.json({
      success: true,
      data: corridors
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
