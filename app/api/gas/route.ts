import { NextRequest, NextResponse } from 'next/server'
import { dispatch } from '@/lib/router'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { function: fn, params } = body

    if (!fn || typeof fn !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing function name' }, { status: 400 })
    }

    const result = await dispatch(fn, params || {})
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Heaven Church Admin API' })
}
