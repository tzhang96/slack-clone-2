'use client'

import { ChannelProvider } from '@/components/providers/ChannelProvider'
import { ChannelList } from '@/components/chat/ChannelList'
import { ChatLayout } from '@/components/layout/ChatLayout'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ChannelProvider>
      <ChatLayout sidebar={<ChannelList />}>
        {children}
      </ChatLayout>
    </ChannelProvider>
  )
} 