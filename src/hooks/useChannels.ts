import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { ChannelRepository } from '@/lib/repositories/channelRepository'
import type { Channel } from '@/types/models'

interface UseChannelsReturn {
  channels: Channel[]
  isLoading: boolean
  error: Error | null
  createChannel: (name: string, description?: string) => Promise<Channel>
  getChannelByName: (name: string) => Channel | undefined
  refreshChannels: () => Promise<void>
  deleteChannel: (channelId: string) => Promise<void>
}

export function useChannels(): UseChannelsReturn {
  const { supabase } = useSupabase()
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchChannels = async () => {
    try {
      const data = await ChannelRepository.getChannels()
      setChannels(data)
    } catch (err) {
      console.error('Error fetching channels:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const createChannel = async (name: string, description?: string): Promise<Channel> => {
    try {
      const channel = await ChannelRepository.createChannel(name, description)
      return channel
    } catch (err) {
      console.error('Error creating channel:', err)
      throw err
    }
  }

  const deleteChannel = async (channelId: string): Promise<void> => {
    try {
      await ChannelRepository.deleteChannel(channelId)
    } catch (err) {
      console.error('Error deleting channel:', err)
      throw err
    }
  }

  const getChannelByName = useCallback((name: string) => {
    return channels.find(c => c.name === name)
  }, [channels])

  const refreshChannels = async () => {
    setIsLoading(true)
    await fetchChannels()
  }

  // Set up real-time subscription
  useEffect(() => {
    fetchChannels()

    const channelSubscription = supabase
      .channel('channels_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newChannel = {
              id: payload.new.id,
              name: payload.new.name,
              description: payload.new.description,
              createdAt: payload.new.created_at
            }
            setChannels(prev => [...prev, newChannel])
          } else if (payload.eventType === 'DELETE') {
            setChannels(prev => prev.filter(channel => channel.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setChannels(prev => prev.map(channel => 
              channel.id === payload.new.id
                ? {
                    id: payload.new.id,
                    name: payload.new.name,
                    description: payload.new.description,
                    createdAt: payload.new.created_at
                  }
                : channel
            ))
          }
        }
      )
      .subscribe()

    return () => {
      channelSubscription.unsubscribe()
    }
  }, [supabase])

  return {
    channels,
    isLoading,
    error,
    createChannel,
    getChannelByName,
    refreshChannels,
    deleteChannel
  }
} 