import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient<Database>({ req, res })

  try {
    // Refresh session if expired - required for Server Components
    await supabase.auth.getSession()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If user is not signed in and the current path is not /login or /signup
    // redirect the user to /login
    if (!session && !['/login', '/signup', '/test'].includes(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // If user is signed in and the current path is /login or /signup
    // redirect the user to /chat
    if (session && ['/login', '/signup'].includes(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/chat', req.url))
    }
  } catch (error) {
    console.error('Error in auth middleware:', error)
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 