import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
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

interface CreateChannelError {
  code: string | null
  message: string
}

export function useChannels(): UseChannelsReturn {
  const { supabase } = useSupabase()
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchChannels = async () => {
    console.log('Fetching channels...');
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('name')

      if (error) throw error

      console.log('Channels fetched:', {
        count: data.length,
        channels: data.map(c => c.name)
      });

      setChannels(data.map(channel => ({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        createdAt: channel.created_at
      })))
    } catch (err) {
      console.error('Error fetching channels:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
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
          console.log('Channel change received:', payload)

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

  const createChannel = async (name: string, description?: string): Promise<Channel> => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .insert({
          name,
          description: description || null
        })
        .select()
        .single()

      if (error) throw error

      const newChannel = {
        id: data.id,
        name: data.name,
        description: data.description,
        createdAt: data.created_at
      }

      // Don't need to update channels here as the subscription will handle it
      return newChannel
    } catch (err) {
      console.error('Error creating channel:', err)
      throw err
    }
  }

  const getChannelByName = useCallback((name: string): Channel | undefined => {
    console.log('Looking up channel by name:', {
      searchName: name,
      availableChannels: channels?.length ?? 0,
      isLoading
    });
    const channel = channels.find(channel => channel.name === name);
    console.log('Channel lookup result:', {
      found: !!channel,
      channelId: channel?.id,
      channelName: channel?.name,
      channelDescription: channel?.description
    });
    return channel;
  }, [channels, isLoading]);

  const refreshChannels = async (): Promise<void> => {
    await fetchChannels()
  }

  const deleteChannel = async (channelId: string): Promise<void> => {
    try {
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId)) {
        console.error('Invalid channel ID format:', channelId)
        throw new Error('Invalid channel ID format')
      }

      console.log('Attempting to delete channel with ID:', channelId)

      // Start a transaction to ensure atomic operations
      const { error: transactionError } = await supabase.rpc('delete_channel_with_messages', {
        channel_id_param: channelId
      })

      if (transactionError) {
        console.error('Error in delete transaction:', transactionError)
        throw transactionError
      }

      console.log('Successfully deleted channel and its messages')
    } catch (err) {
      console.error('Error in deleteChannel:', err)
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        })
      }
      throw err
    }
  }

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