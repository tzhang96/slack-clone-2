import { useReactions } from '@/hooks/useReactions'
import { useReactionMutations } from '@/hooks/useReactionMutations'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { ReactionWithUser } from '@/types/supabase'
import { useCallback } from 'react'
import { toast } from 'sonner'

interface MessageReactionsProps {
  messageId: string
  className?: string
}

interface GroupedReaction {
  emoji: string
  users: ReactionWithUser['user'][]
}

export function MessageReactions({ messageId, className }: MessageReactionsProps) {
  const { session } = useSupabase()
  const { groupedReactions, isLoading } = useReactions(messageId)
  const { toggleReaction, isLoading: isMutating, isAuthenticated } = useReactionMutations()

  const handleReactionClick = useCallback(async (emoji: string) => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to react to messages')
      return
    }

    try {
      await toggleReaction(messageId, emoji)
    } catch (error) {
      console.error('Error toggling reaction:', error)
      toast.error('Failed to toggle reaction')
    }
  }, [isAuthenticated, messageId, toggleReaction])

  // Don't render anything while loading initial data
  if (isLoading || groupedReactions.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1.5 relative', className)}>
      {groupedReactions.map(({ emoji, users }: GroupedReaction) => {
        const hasReacted = users.some(user => user.id === session?.user?.id)
        
        return (
          <TooltipProvider key={emoji}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-6 rounded-full px-2 text-xs transition-all duration-200',
                    hasReacted 
                      ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium dark:bg-blue-900/50 dark:hover:bg-blue-900/70 dark:text-blue-300' 
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:hover:bg-gray-800/50 dark:text-gray-300',
                    isMutating && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => handleReactionClick(emoji)}
                  disabled={isMutating}
                >
                  <span className="mr-1">{emoji}</span>
                  <span className={cn(
                    'font-medium transition-colors duration-200',
                    hasReacted 
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                  )}>{users.length}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  {users.map(user => user.full_name || user.username).join(', ')}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}
    </div>
  )
} 