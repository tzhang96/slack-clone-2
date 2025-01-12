'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePresence } from '@/hooks/usePresence'
import type { UserStatus } from '@/types/presence'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { initializeData } from '@/lib/init-data'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { debounce } from '@/lib/utils'

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

  // Create separate debounced functions for online and away status
  const debouncedSetOnline = useCallback(
    debounce(() => updateStatus('online'), 1000, true), // Immediate for better responsiveness
    [user]
  )

  const debouncedSetAway = useCallback(
    debounce(() => updateStatus('away'), 3000, false), // Delayed to prevent flickering
    [user]
  )

  // Set initial online status when user logs in
  useEffect(() => {
    if (!loading && user) {
      // Use direct updateStatus call for initial status
      updateStatus('online')
    }
  }, [user, loading])

  // Handle presence detection
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = () => {
      if (!loading) {
        if (document.hidden) {
          debouncedSetAway()
        } else {
          debouncedSetOnline()
        }
      }
    }

    const handleFocus = () => {
      if (!loading) {
        debouncedSetOnline()
      }
    }

    const handleBlur = () => {
      if (!loading) {
        debouncedSetAway()
      }
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [user, loading, debouncedSetOnline, debouncedSetAway])

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

      // Handle reconnection
      const connectionChannel = supabase.channel('connection_monitor')
        .on('system', { event: 'reconnected' }, () => {
          console.log('Reloading user statuses after reconnection')
          loadStatuses()
        })
        .subscribe()

      return () => {
        if (presenceChannel) {
          presenceChannel.unsubscribe()
        }
        connectionChannel.unsubscribe()
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