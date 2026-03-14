import { NextResponse } from 'next/server'

export function middleware(request) {
  const hostname = request.headers.get('host') || ''
  const isAdminSubdomain = hostname.startsWith('admin.')

  if (isAdminSubdomain) {
    const url = request.nextUrl.clone()
    // Rewrite admin.* to /admin path
    if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api')) {
      url.pathname = '/admin' + url.pathname
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
