import { useRef, useState } from 'react'
import { usePresenceContext } from '@/components/providers/PresenceProvider'
import { formatDistanceToNow } from 'date-fns'
import { StatusIndicator } from '@/components/presence/StatusIndicator'
import { MessageSquare, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface UserTooltipProps {
  userId: string
  name: string
  lastSeen: string
  children: React.ReactNode
  isBot?: boolean
}

export function UserTooltip({ userId, name, lastSeen, children, isBot = false }: UserTooltipProps) {
  const { user } = useAuth()
  const presenceContext = user ? usePresenceContext() : null
  const status = isBot ? 'online' : (presenceContext?.userStatuses[userId] || 'offline')
  const router = useRouter()
  const { supabase } = useSupabase()
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const startDM = async (isAIChat = false) => {
    if (!user) {
      router.push('/login')
      return
    }

    setIsLoading(true)
    try {
      let botUserId = null
      
      if (isAIChat) {
        // Check if bot user already exists for the clicked user
        const { data: existingBot } = await supabase
          .from('users')
          .select('id')
          .eq('bot_owner_id', userId)
          .eq('is_bot', true)
          .single()

        if (existingBot) {
          botUserId = existingBot.id
        } else {
          // Create bot user for the clicked user
          const { data: newBot, error: botError } = await supabase
            .rpc('create_bot_user', { owner_id: userId })
            .single()

          if (botError) throw botError
          botUserId = newBot
        }
      }

      // Check if conversation exists
      const { data: existingConvo } = await supabase
        .from('dm_conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${isAIChat ? botUserId : userId},user2_id.eq.${isAIChat ? botUserId : userId}`)
        .single()

      if (existingConvo) {
        router.push(`/dm/${existingConvo.id}`)
        return
      }

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from('dm_conversations')
        .insert({
          user1_id: user.id,
          user2_id: isAIChat ? botUserId : userId,
          is_ai_chat: isAIChat
        })
        .select('id')
        .single()

      if (error) throw error

      router.push(`/dm/${newConvo.id}`)
    } catch (error) {
      console.error('Error starting DM:', error)
      toast.error('Failed to start conversation')
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild onClick={(e) => {
          e.preventDefault()
          setIsOpen(!isOpen)
        }}>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="center"
          sideOffset={8}
          className="shadow-sm p-3 text-sm whitespace-nowrap z-50"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="font-medium">{name}</div>
            {user && (
              <div className="flex items-center gap-1 text-gray-500">
                <StatusIndicator status={status} className="w-2 h-2" />
                <span className="capitalize">{status}</span>
              </div>
            )}
            <div className="text-xs text-gray-500">
              Last seen {formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}
            </div>
            {isBot ? (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Bot className="w-3 h-3" />
                <span>Bot</span>
              </div>
            ) : user && userId !== user.id && (
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="flex items-center gap-1 w-full"
                  onClick={() => startDM(false)}
                  disabled={isLoading}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Message</span>
                </Button>
                {status === 'offline' && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="flex items-center gap-1 w-full"
                    onClick={() => startDM(true)}
                    disabled={isLoading}
                  >
                    <Bot className="w-3 h-3" />
                    <span>AI Reply Guy</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 