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
        throw new Error('User must be logged in')
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
        // If it's a duplicate, that's fine - the toggle will handle it
        if (error.code === '23505') return null
        throw error
      }
    },
    onSettled: (_, __, variables) => {
      // Always invalidate the query after mutation settles
      queryClient.invalidateQueries({ queryKey: ['reactions', variables.messageId] })
    }
  })

  // Remove reaction mutation
  const removeReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!session?.user?.id) {
        throw new Error('User must be logged in')
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
    onSettled: (_, __, variables) => {
      // Always invalidate the query after mutation settles
      queryClient.invalidateQueries({ queryKey: ['reactions', variables.messageId] })
    }
  })

  // Helper to toggle reaction
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!session?.user?.id) {
      throw new Error('User must be logged in')
    }

    // Get current reactions to check state
    const { data: currentReactions } = await supabase
      .from('reactions')
      .select('id')
      .match({
        message_id: messageId,
        user_id: session.user.id,
        emoji
      })

    const hasReaction = currentReactions && currentReactions.length > 0

    try {
      if (hasReaction) {
        await removeReaction.mutateAsync({ messageId, emoji })
      } else {
        await addReaction.mutateAsync({ messageId, emoji })
      }
    } catch (error) {
      // If the error is a unique violation, the state might have changed
      // between our check and the mutation. Retry the toggle.
      if (error instanceof Error && error.message.includes('23505')) {
        await toggleReaction(messageId, emoji)
      } else {
        throw error
      }
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