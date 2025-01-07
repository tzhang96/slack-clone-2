import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Ensure environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return res
  }

  // Ensure URL is properly formatted
  try {
    new URL(supabaseUrl)
  } catch (error) {
    console.error('Invalid Supabase URL:', supabaseUrl)
    return res
  }
  
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
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