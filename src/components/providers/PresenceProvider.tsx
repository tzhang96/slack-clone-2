'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePresence } from '@/hooks/usePresence'
import type { UserStatus } from '@/types/presence'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { initializeData } from '@/lib/init-data'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceContextType {
  status: UserStatus
  updateStatus: (status: UserStatus) => Promise<void>
  userStatuses: Record<string, UserStatus>
  error: Error | null
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined)

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { status, updateStatus: hookUpdateStatus, error } = usePresence()
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({})
  const { user, loading } = useAuth()

  // Wrap updateStatus to also update userStatuses
  const updateStatus = async (newStatus: UserStatus) => {
    if (!user) return
    await hookUpdateStatus(newStatus)
    setUserStatuses(current => ({
      ...current,
      [user.id]: newStatus
    }))
  }

  // Handle presence detection
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = () => {
      // Only update status if we're not in the initial loading state
      if (!loading) {
        updateStatus(document.hidden ? 'away' : 'online')
      }
    }

    const handleFocus = () => {
      if (!loading) {
        updateStatus('online')
      }
    }

    const handleBlur = () => {
      if (!loading) {
        updateStatus('away')
      }
    }

    const handleBeforeUnload = () => {
      if (!user) return
      
      // Use Supabase client directly for more reliable updates
      const body = {
        status: 'offline',
        last_seen: new Date().toISOString()
      }
      
      // Using fetch with keepalive to ensure the request completes
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(body),
          keepalive: true
        }
      ).catch(console.error)
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Set initial status based on visibility only after loading
    if (!loading && document.hidden) {
      updateStatus('away')
    }

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user, loading])

  // Initialize app data when auth is ready
  useEffect(() => {
    if (user) {
      initializeData().catch(console.error)
    }
  }, [user])

  // Load initial statuses and set up real-time subscription
  useEffect(() => {
    let presenceChannel: RealtimeChannel | null = null

    const loadStatuses = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, status')

      if (error) {
        console.error('Error loading user statuses:', error)
        return
      }

      const statuses = data.reduce((acc, user) => ({
        ...acc,
        [user.id]: user.status
      }), {})

      setUserStatuses(statuses)
    }

    const setupRealtimeSubscription = () => {
      presenceChannel = supabase
        .channel('user_status_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: 'status IS NOT NULL'
          },
          (payload) => {
            setUserStatuses(current => ({
              ...current,
              [payload.new.id]: payload.new.status as UserStatus
            }))
          }
        )
        .subscribe()
    }

    if (user) {
      loadStatuses()
      setupRealtimeSubscription()
    }

    return () => {
      if (presenceChannel) {
        presenceChannel.unsubscribe()
      }
    }
  }, [user])

  return (
    <PresenceContext.Provider value={{
      status,
      updateStatus,
      userStatuses,
      error
    }}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresenceContext() {
  const context = useContext(PresenceContext)
  if (context === undefined) {
    throw new Error('usePresenceContext must be used within a PresenceProvider')
  }
  return context
} 