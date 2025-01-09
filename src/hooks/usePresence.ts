'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { UserStatus } from '@/types/presence'

export function usePresence() {
  const { user } = useAuth()
  const [status, setStatus] = useState<UserStatus>('offline')
  const [error, setError] = useState<Error | null>(null)

  // Update status in the database
  const updateStatus = async (newStatus: UserStatus) => {
    if (!user) return

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: newStatus,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError
      setStatus(newStatus)
    } catch (err) {
      console.error('Error updating status:', err)
      setError(err instanceof Error ? err : new Error('Failed to update status'))
    }
  }

  // Set initial online status
  useEffect(() => {
    if (user) {
      updateStatus('online')
    }
  }, [user])

  return {
    status,
    updateStatus,
    error
  }
} 