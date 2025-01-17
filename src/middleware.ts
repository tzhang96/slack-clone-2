import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

const PUBLIC_ROUTES = ['/login', '/signup', '/test']

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
    // Verify user's session
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      // If no user and trying to access protected route, redirect to login
      if (!PUBLIC_ROUTES.includes(req.nextUrl.pathname)) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    } else {
      // If user exists and trying to access public route, redirect to chat
      if (PUBLIC_ROUTES.includes(req.nextUrl.pathname)) {
        return NextResponse.redirect(new URL('/chat', req.url))
      }
    }

    // Update user's last seen
    if (user) {
      await supabase.from('users').upsert({
        id: user.id,
        last_seen: new Date().toISOString(),
      })
    }

    return res
  } catch (e) {
    // On error, allow request to continue but clear user state
    return res
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 