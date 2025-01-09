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
  const { toggleReaction, isLoading: isMutating } = useReactionMutations()

  if (isLoading || groupedReactions.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
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
                    'h-6 rounded-full px-2 text-xs',
                    hasReacted && 'bg-primary/10 hover:bg-primary/20'
                  )}
                  onClick={() => toggleReaction(messageId, emoji)}
                  disabled={isMutating}
                >
                  <span className="mr-1">{emoji}</span>
                  <span>{users.length}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {users.map(user => user.full_name).join(', ')}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}
    </div>
  )
} 