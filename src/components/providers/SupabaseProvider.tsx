'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { type Session } from '@supabase/supabase-js'
import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/supabase'

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  session: Session | null
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  const [supabase] = useState(() =>
    createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return document.cookie
              .split('; ')
              .find((row) => row.startsWith(name))
              ?.split('=')[1]
          },
          set(name: string, value: string, options: { path: string }) {
            document.cookie = `${name}=${value}; path=${options.path}`
          },
          remove(name: string, options: { path: string }) {
            document.cookie = `${name}=; path=${options.path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          },
        },
      }
    )
  )

  return (
    <Context.Provider value={{ supabase, session }}>
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
} 