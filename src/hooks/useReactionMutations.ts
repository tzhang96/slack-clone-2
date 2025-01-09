import { useSupabase } from '@/components/providers/SupabaseProvider'
import { ReactionInsert } from '@/types/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export const useReactionMutations = () => {
  const { supabase, session } = useSupabase()
  const queryClient = useQueryClient()

  // Add reaction mutation
  const addReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!session?.user?.id) {
        return // Let the UI handle the error
      }

      const reaction: ReactionInsert = {
        message_id: messageId,
        user_id: session.user.id,
        emoji
      }

      const { error } = await supabase
        .from('reactions')
        .insert(reaction)

      if (error) {
        // If error is duplicate reaction, we can ignore it
        if (error.code === '23505') return // unique_violation
        throw error
      }
    },
    onSuccess: (_, { messageId }) => {
      queryClient.invalidateQueries({ queryKey: ['reactions', messageId] })
    }
  })

  // Remove reaction mutation
  const removeReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!session?.user?.id) {
        return // Let the UI handle the error
      }

      const { error } = await supabase
        .from('reactions')
        .delete()
        .match({
          message_id: messageId,
          user_id: session.user.id,
          emoji
        })

      if (error) throw error
    },
    onSuccess: (_, { messageId }) => {
      queryClient.invalidateQueries({ queryKey: ['reactions', messageId] })
    }
  })

  // Helper to toggle reaction
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!session?.user?.id) {
      return // Let the UI handle the error
    }

    try {
      // Check if reaction exists
      const { data: existing } = await supabase
        .from('reactions')
        .select('id')
        .match({
          message_id: messageId,
          user_id: session.user.id,
          emoji
        })
        .single()

      if (existing) {
        await removeReaction.mutateAsync({ messageId, emoji })
      } else {
        await addReaction.mutateAsync({ messageId, emoji })
      }
    } catch (error) {
      // If error is not found for single row query, it means reaction doesn't exist
      if (error instanceof Error && error.message.includes('No rows returned')) {
        await addReaction.mutateAsync({ messageId, emoji })
        return
      }
      throw error
    }
  }

  return {
    addReaction,
    removeReaction,
    toggleReaction,
    isLoading: addReaction.isPending || removeReaction.isPending,
    isAuthenticated: !!session?.user?.id
  }
} 