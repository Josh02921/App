import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', database: 'connected' })
  } catch (error: any) {
    // Return 200 even if DB is not ready yet — Railway healthcheck must pass for app to start
    return NextResponse.json({ status: 'ok', database: 'unavailable' })
  }
}
