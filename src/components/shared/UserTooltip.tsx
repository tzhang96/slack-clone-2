import { useRef, useState } from 'react'
import { usePresenceContext } from '@/components/providers/PresenceProvider'
import { formatDistanceToNow } from 'date-fns'
import { StatusIndicator } from '@/components/presence/StatusIndicator'
import { MessageSquare, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { toast } from 'sonner'

interface UserTooltipProps {
  userId: string
  name: string
  lastSeen: string
  children: React.ReactNode
}

export function UserTooltip({ userId, name, lastSeen, children }: UserTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { userStatuses } = usePresenceContext()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const status = userStatuses[userId] || 'offline'
  const router = useRouter()
  const { supabase } = useSupabase()

  // Close tooltip when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }

  // Add/remove click listener
  const handleClick = () => {
    if (!isOpen) {
      document.addEventListener('click', handleClickOutside)
    } else {
      document.removeEventListener('click', handleClickOutside)
    }
    setIsOpen(!isOpen)
  }

  const handleStartDM = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Not authenticated')

      // Create conversation with ordered user IDs
      const [user1_id, user2_id] = [currentUser.id, userId].sort()
      
      // Try to find existing conversation first
      const { data: existingConv } = await supabase
        .from('dm_conversations')
        .select('id')
        .eq('user1_id', user1_id)
        .eq('user2_id', user2_id)
        .eq('is_ai_chat', false)
        .single()

      if (existingConv) {
        router.push(`/dm/${existingConv.id}`)
        return
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('dm_conversations')
        .insert({
          user1_id,
          user2_id,
          is_ai_chat: false
        })
        .select()
        .single()

      if (error) throw error
      if (!newConv) throw new Error('Failed to create conversation')

      router.push(`/dm/${newConv.id}`)
    } catch (error) {
      console.error('Failed to start conversation:', error)
      toast.error('Failed to start conversation')
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  const handleStartAIChat = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Not authenticated')

      // First, ensure a bot user exists for the target user
      const { data: existingBot } = await supabase
        .from('users')
        .select('id')
        .eq('bot_owner_id', userId)
        .eq('is_bot', true)
        .single()

      let botId = existingBot?.id
      if (!botId) {
        // Create a new bot user if one doesn't exist
        const { data: newBotId, error: botError } = await supabase
          .rpc('create_bot_user', { owner_id: userId })
        
        if (botError) throw botError
        botId = newBotId
      }

      if (!botId) throw new Error('Failed to get or create bot user')

      // Create conversation with ordered user IDs
      const [user1_id, user2_id] = [currentUser.id, botId].sort()
      
      // Try to find existing AI conversation first
      const { data: existingConv } = await supabase
        .from('dm_conversations')
        .select('id')
        .eq('user1_id', user1_id)
        .eq('user2_id', user2_id)
        .eq('is_ai_chat', true)
        .single()

      if (existingConv) {
        router.push(`/dm/${existingConv.id}`)
        return
      }

      // Create new AI conversation
      const { data: newConv, error } = await supabase
        .from('dm_conversations')
        .insert({
          user1_id,
          user2_id,
          is_ai_chat: true
        })
        .select()
        .single()

      if (error) throw error
      if (!newConv) throw new Error('Failed to create conversation')

      router.push(`/dm/${newConv.id}`)
    } catch (error) {
      console.error('Failed to start AI chat:', error)
      toast.error('Failed to start AI chat')
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={tooltipRef}>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
      {isOpen && (
        <div className="absolute z-50 left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
          <div className="p-3">
            <div className="font-medium text-gray-900 dark:text-gray-100">{name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <StatusIndicator status={status} className="w-2 h-2" />
              <span className="capitalize">{status}</span>
            </div>
            {status === 'offline' && (
              <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Last seen {formatDistanceToNow(new Date(lastSeen))} ago
              </div>
            )}
            <div className="mt-3 -mx-1 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                onClick={handleStartDM}
                disabled={isLoading}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
              {status === 'offline' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  onClick={handleStartAIChat}
                  disabled={isLoading}
                >
                  <Bot className="w-4 h-4 mr-2" />
                  AI REPLY GUY
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 