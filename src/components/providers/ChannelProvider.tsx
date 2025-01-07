'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useChannels } from '@/hooks/useChannels'
import { Channel } from '@/lib/init-data'

interface ChannelContextType {
  channels: Channel[]
  isLoading: boolean
  error: Error | null
  getChannelByName: (name: string) => Channel | undefined
  refreshChannels: () => Promise<void>
  createChannel: (name: string, description?: string) => Promise<Channel>
  deleteChannel: (channelId: string) => Promise<void>
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined)

export function useChannelContext() {
  const context = useContext(ChannelContext)
  if (!context) {
    throw new Error('useChannelContext must be used within a ChannelProvider')
  }
  return context
}

interface ChannelProviderProps {
  children: ReactNode
}

export function ChannelProvider({ children }: ChannelProviderProps) {
  const channelData = useChannels()

  return (
    <ChannelContext.Provider value={channelData}>
      {children}
    </ChannelContext.Provider>
  )
} 