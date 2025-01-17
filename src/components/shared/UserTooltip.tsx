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

  const startDM = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    setIsLoading(true)
    try {
      // Check if conversation exists
      const { data: existingConvo } = await supabase
        .from('dm_conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
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
          user2_id: userId,
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
    }
  }

  return (
    <div className="group relative">
      {children}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-sm whitespace-nowrap z-50">
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
            <Button 
              size="sm" 
              variant="ghost" 
              className="flex items-center gap-1"
              onClick={startDM}
              disabled={isLoading}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Message</span>
            </Button>
          )}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-white dark:bg-gray-800 transform rotate-45" />
      </div>
    </div>
  )
} 