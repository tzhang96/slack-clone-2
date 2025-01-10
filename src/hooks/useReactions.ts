import { useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { ReactionWithUser } from '@/types/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type DatabaseReaction = Omit<ReactionWithUser, 'user'> & {
  user: {
    id: string
    full_name: string
    username: string
  }
}

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
          id,
          emoji,
          message_id,
          user_id,
          user:users!inner (
            id,
            full_name,
            username
          )
        `)
        .eq('message_id', messageId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transform the data to match ReactionWithUser type
      return (data as unknown as DatabaseReaction[]).map(reaction => ({
        ...reaction,
        user: reaction.user
      }))
    }
  })

  // Set up real-time subscription
  useEffect(() => {
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
        () => {
          queryClient.invalidateQueries({ queryKey: ['reactions', messageId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [messageId, supabase, queryClient])

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