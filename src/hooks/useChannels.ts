import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Channel, defaultChannels } from '@/lib/init-data'

interface UseChannelsReturn {
  channels: Channel[]
  isLoading: boolean
  error: Error | null
  getChannelByName: (name: string) => Channel | undefined
  refreshChannels: () => Promise<void>
  createChannel: (name: string, description?: string) => Promise<Channel>
  deleteChannel: (channelId: string) => Promise<void>
}

interface CreateChannelError extends Error {
  code?: string
}

export function useChannels(): UseChannelsReturn {
  console.log('useChannels hook initialized')
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Subscribe to real-time channel changes
  useEffect(() => {
    const channelSubscription = supabase
      .channel('channels')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'channels' 
        }, 
        (payload) => {
          console.log('Channel change received:', payload)
          
          // For inserts, only update if we don't already have this channel
          // This prevents duplicate channels when we're the one who created it
          switch (payload.eventType) {
            case 'INSERT':
              const newChannel = payload.new as Channel
              setChannels(prev => {
                // Check if we already have this channel
                if (prev.some(c => c.id === newChannel.id)) {
                  return prev
                }
                return [...prev, newChannel]
              })
              break
            // For deletes and updates, always process them
            case 'DELETE':
              const deletedChannel = payload.old as Channel
              setChannels(prev => prev.filter(c => c.id !== deletedChannel.id))
              break
            case 'UPDATE':
              const updatedChannel = payload.new as Channel
              setChannels(prev => prev.map(c => 
                c.id === updatedChannel.id ? updatedChannel : c
              ))
              break
          }
        }
      )
      .subscribe()

    return () => {
      console.log('Unsubscribing from channel changes')
      channelSubscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    console.log('useChannels state:', {
      channelCount: channels.length,
      isLoading,
      hasError: !!error,
      channels: channels.map(c => c.name)
    })
  }, [channels, isLoading, error])

  const initializeDefaultChannels = async () => {
    const { error: insertError } = await supabase
      .from('channels')
      .insert(defaultChannels)

    if (insertError) {
      console.error('Error creating default channels:', insertError)
      throw insertError
    }
  }

  const refreshChannels = async () => {
    setIsLoading(true)
    setError(null)
    setChannels([])

    try {
      const { data: existingChannels, error: fetchError } = await supabase
        .from('channels')
        .select('id, name, description')
        .order('name')

      if (fetchError) throw fetchError

      if (!existingChannels || existingChannels.length === 0) {
        await initializeDefaultChannels()
        
        const { data: channels, error: refetchError } = await supabase
          .from('channels')
          .select('id, name, description')
          .order('name')

        if (refetchError) throw refetchError
        
        setChannels(channels || [])
      } else {
        setChannels(existingChannels)
      }
    } catch (err) {
      setError(err as Error)
    }
    
    setIsLoading(false)
  }

  const getChannelByName = (name: string) => {
    return channels.find(channel => channel.name === name)
  }

  const createChannel = async (name: string, description?: string): Promise<Channel> => {
    // Validate channel name format
    if (!/^[a-z0-9-]{3,50}$/.test(name)) {
      const error = new Error('Channel name must be 3-50 characters long and contain only lowercase letters, numbers, and hyphens') as CreateChannelError
      error.code = 'invalid_name_format'
      throw error
    }

    // Check for duplicate channel name
    const existingChannel = channels.find(c => c.name === name)
    if (existingChannel) {
      const error = new Error('A channel with this name already exists') as CreateChannelError
      error.code = 'duplicate_name'
      throw error
    }

    try {
      const { data, error } = await supabase
        .from('channels')
        .insert({
          name,
          description: description || null
        })
        .select()
        .single()

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          const duplicateError = new Error('A channel with this name already exists') as CreateChannelError
          duplicateError.code = 'duplicate_name'
          throw duplicateError
        }
        throw error
      }

      const newChannel = data as Channel
      // Add optimistic update
      setChannels(prev => [...prev, newChannel])
      return newChannel
    } catch (err) {
      console.error('Error creating channel:', err)
      throw err
    }
  }

  const deleteChannel = async (channelId: string): Promise<void> => {
    console.log('deleteChannel called with ID:', channelId)
    // Prevent deletion of the general channel
    const channel = channels.find(c => c.id === channelId)
    console.log('Found channel:', channel)
    if (channel?.name === 'general') {
      throw new Error('Cannot delete the general channel')
    }

    try {
      console.log('Attempting to delete channel in Supabase...')
      const { data, error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId)
        .select()

      console.log('Supabase delete response:', { data, error })

      if (error) {
        console.error('Supabase deletion error:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.warn('No rows were deleted from Supabase')
        throw new Error('Channel not found in database')
      }

      // Remove optimistic update since real-time will handle it
      console.log('Channel deleted successfully')
    } catch (err) {
      console.error('Error deleting channel:', err)
      throw err
    }
  }

  // Load channels on mount
  useEffect(() => {
    refreshChannels()
  }, [])

  return {
    channels,
    isLoading,
    error,
    getChannelByName,
    refreshChannels,
    createChannel,
    deleteChannel
  }
} 