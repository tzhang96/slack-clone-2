'use client'

import { useEffect } from 'react'
import { ChannelProvider } from '@/components/providers/ChannelProvider'
import { ChannelList } from '@/components/chat/ChannelList'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ChannelProvider>
      <div className="flex h-screen">
        <div className="w-64 bg-gray-900 text-white">
          <ChannelList />
        </div>
        <div className="flex-1 bg-white">
          {children}
        </div>
      </div>
    </ChannelProvider>
  )
} 