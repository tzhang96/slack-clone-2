import { useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { ReactionWithUser } from '@/types/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export const useReactions = (messageId: string) => {
  const { supabase } = useSupabase()
  const queryClient = useQueryClient()

  // Fetch reactions for a message
  const { data: reactions = [], isLoading, error } = useQuery<ReactionWithUser[]>({
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
    },
    // Add these options to help with loading states
    initialData: [],
    staleTime: 1000,
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  })

  // Set up real-time subscription
  useEffect(() => {
    console.log(`Setting up reaction subscription for message ${messageId}`)
    
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `message_id=eq.${messageId}`
        },
        async () => {
          // Invalidate the query instead of trying to update cache directly
          queryClient.invalidateQueries({ queryKey: ['reactions', messageId] })
        }
      )
      .subscribe((status) => {
        console.log(`Reaction subscription status for message ${messageId}:`, status)
      })

    return () => {
      console.log(`Cleaning up reaction subscription for message ${messageId}`)
      channel.unsubscribe()
    }
  }, [messageId, queryClient, supabase])

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc: Array<{ emoji: string, users: ReactionWithUser['user'][] }>, reaction: ReactionWithUser) => {
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
  }, [])

  return {
    groupedReactions,
    isLoading,
    error
  }
} 