'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { UserStatus } from '@/types/presence'

export function usePresence() {
  const { user, loading } = useAuth()
  const [status, setStatus] = useState<UserStatus>('offline')
  const [error, setError] = useState<Error | null>(null)
  const heartbeatInterval = useRef<NodeJS.Timeout>()

  // Send heartbeat to keep user active
  const sendHeartbeat = async () => {
    if (!user) return

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) throw updateError
    } catch (err) {
      console.error('Error sending heartbeat:', err)
    }
  }

  // Update status in the database
  const updateStatus = async (newStatus: UserStatus) => {
    if (!user) return

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: newStatus,
          last_seen: new Date().toISOString(),
          last_heartbeat: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError
      setStatus(newStatus)
    } catch (err) {
      console.error('Error updating status:', err)
      setError(err instanceof Error ? err : new Error('Failed to update status'))
    }
  }

  // Set up heartbeat interval
  useEffect(() => {
    if (!loading && user && status !== 'offline') {
      // Send initial heartbeat
      sendHeartbeat()

      // Set up interval for subsequent heartbeats (every 20 seconds)
      heartbeatInterval.current = setInterval(sendHeartbeat, 20000)

      return () => {
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current)
        }
      }
    }
  }, [user, loading, status])

  // Set initial online status only after auth loading is complete
  useEffect(() => {
    if (!loading && user) {
      updateStatus('online')
    }
  }, [user, loading])

  // Handle Supabase client reconnection
  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('connection_status')
      .on('system', { event: 'reconnected' }, () => {
        console.log('Supabase client reconnected, updating status to online')
        updateStatus('online')
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  return {
    status,
    updateStatus,
    error
  }
} 