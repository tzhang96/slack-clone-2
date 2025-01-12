import { useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { ReactionWithUser } from '@/types/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export const useReactions = (messageId: string) => {
  const { supabase } = useSupabase()
  const queryClient = useQueryClient()

  // Fetch reactions for a message
  const { data: reactions, isLoading, error } = useQuery<ReactionWithUser[]>({
    queryKey: ['reactions', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reactions')
        .select(`
          *,
          user:users(id, full_name, username)
        `)
        .eq('message_id', messageId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as ReactionWithUser[]
    }
  })

  // Set up real-time subscription
  useEffect(() => {
    console.log(`Setting up reaction subscription for message ${messageId}`)
    
    const channel = supabase
      .channel(`reactions:${messageId}:${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
          filter: `message_id=eq.${messageId}`
        },
        async (payload) => {
          console.log('Reaction INSERT event:', payload)
          await refreshReactions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reactions',
          filter: `old_message_id=eq.${messageId}`
        },
        async (payload) => {
          console.log('Reaction DELETE event received:', {
            old: payload.old,
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            commit_timestamp: payload.commit_timestamp
          })
          
          try {
            await refreshReactions()
            console.log('Successfully refreshed reactions after DELETE')
          } catch (error) {
            console.error('Error refreshing reactions after DELETE:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for reactions:${messageId}:`, status)
      })

    return () => {
      console.log(`Cleaning up reaction subscription for message ${messageId}`)
      supabase.removeChannel(channel)
    }
  }, [messageId, supabase, queryClient])

  // Helper function to refresh reactions
  const refreshReactions = async () => {
    console.log('Refreshing reactions for message:', messageId)
    const { data, error } = await supabase
      .from('reactions')
      .select(`
        *,
        user:users(id, full_name, username)
      `)
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error refreshing reactions:', error)
      throw error
    }

    console.log('Current reactions state:', {
      messageId,
      reactionCount: data?.length || 0,
      reactions: data
    })

    queryClient.setQueryData(['reactions', messageId], data)
  }

  // Group reactions by emoji for easier rendering
  const groupedReactions = reactions?.reduce((acc, reaction) => {
    const existing = acc.find(g => g.emoji === reaction.emoji)
    if (existing) {
      existing.users.push(reaction.user)
    } else {
      acc.push({
        emoji: reaction.emoji,
        users: [reaction.user]
      })
    }
    return acc
  }, [] as { emoji: string; users: ReactionWithUser['user'][] }[]) ?? []

  return {
    reactions,
    groupedReactions,
    isLoading,
    error
  }
} 