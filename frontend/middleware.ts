// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // If user is on the root path, redirect to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Optional: Protect dashboard routes from unauthenticated access
  const token = request.cookies.get('token')?.value
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/accounts') || pathname.startsWith('/schedule') || pathname.startsWith('/reports') || pathname.startsWith('/settings')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/((?!api|_next|_static|favicon.ico).*)'],
}