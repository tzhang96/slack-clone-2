'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePresence } from '@/hooks/usePresence'
import type { UserStatus } from '@/types/presence'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { initializeData } from '@/lib/init-data'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { debounce } from 'lodash-es'

interface PresenceContextType {
  status: UserStatus
  updateStatus: (status: UserStatus) => Promise<void>
  userStatuses: Record<string, UserStatus>
  error: Error | null
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined)

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { status, updateStatus, error } = usePresence()
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({})

  // Initialize app data when auth is ready
  useEffect(() => {
    if (!user) return
    initializeData().catch(console.error)
  }, [user])

  // Load initial statuses and set up real-time subscription
  useEffect(() => {
    if (!user) return

    let presenceChannel: RealtimeChannel | null = null

    const loadStatuses = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, status')
        .not('status', 'is', null)

      if (error) {
        console.error('Error loading user statuses:', error)
        return
      }

      const statuses = data.reduce((acc, user) => ({
        ...acc,
        [user.id]: user.status
      }), {} as Record<string, UserStatus>)

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
            filter: `id=neq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new && 'status' in payload.new) {
              const { id, status } = payload.new
              if (typeof id === 'string' && typeof status === 'string') {
                setUserStatuses(current => ({
                  ...current,
                  [id]: status as UserStatus
                }))
              }
            }
          }
        )
        .subscribe()

      return presenceChannel
    }

    loadStatuses()
    const channel = setupRealtimeSubscription()

    // Handle reconnection
    const connectionChannel = supabase.channel('connection_monitor')
      .on('system', { event: 'reconnected' }, () => {
        console.log('Reloading user statuses after reconnection')
        loadStatuses()
      })
      .subscribe()

    return () => {
      if (channel) {
        channel.unsubscribe()
      }
      connectionChannel.unsubscribe()
    }
  }, [user])

  const value = {
    status,
    updateStatus,
    userStatuses,
    error
  }

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  )
}

export const usePresenceContext = () => {
  const context = useContext(PresenceContext)
  if (context === undefined) {
    throw new Error('usePresenceContext must be used inside PresenceProvider')
  }
  return context
} 