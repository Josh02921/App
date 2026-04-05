import { NextRequest } from 'next/server'
import { serveHtmlPage } from '@/lib/page-server'

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') || 'login'
  return serveHtmlPage(page)
}
