import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { Routes } from './config/routes'

export async function middleware(request: NextRequest)
{
  // Extract token using the secret for session-based authentication
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })
  const { pathname } = request.nextUrl

  // if path is /app redirect to login or dashboard based on auth status
  if (pathname === '/app')
  {
    if (!token)
    {
      const loginUrl = new URL(Routes.login, request.url)
      return NextResponse.redirect(loginUrl)
    }
    const dashboardUrl = new URL(Routes.dashboard, request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Check if the path starts with /app/dashboard
  if (pathname.startsWith(Routes.dashboard))
  {
    if (!token)
    {
      // Redirect to login if not authenticated
      const loginUrl = new URL(Routes.login, request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect admin routes - require ADMIN role
  if (pathname.startsWith('/admin'))
  {
    if (!token)
    {
      // Redirect to login if not authenticated
      const loginUrl = new URL(Routes.login, request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Check if user has ADMIN role
    if (token.role !== 'ADMIN')
    {
      // Redirect non-admins to dashboard
      const dashboardUrl = new URL(Routes.dashboard, request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // If user is authenticated and visiting auth pages, redirect to dashboard
  if (token && (pathname === Routes.login || pathname === Routes.register || pathname === Routes.requestAccess))
  {
    const dashboardUrl = new URL(Routes.dashboard, request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Set the pathname in the response headers
  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)

  request.headers?.set('x-current-url', request.nextUrl?.href ?? '')

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
