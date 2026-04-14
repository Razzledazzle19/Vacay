import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabase, response } = createMiddlewareClient(request)

  // Refresh session if expired — required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not logged in → redirect to /login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch the user's role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as 'host' | 'cleaner' | undefined

  const isHostRoute = pathname.startsWith('/dashboard/host')
  const isCleanerRoute = pathname.startsWith('/dashboard/cleaner')

  // Redirect if visiting the wrong dashboard for their role
  if (isHostRoute && role !== 'host') {
    return NextResponse.redirect(new URL('/dashboard/cleaner', request.url))
  }

  if (isCleanerRoute && role !== 'cleaner') {
    return NextResponse.redirect(new URL('/dashboard/host', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
