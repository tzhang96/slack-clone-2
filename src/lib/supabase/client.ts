'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// For client components
export const createClient = () => {
  return createClientComponentClient<Database>()
}

export const supabase = createClient() 