'use client'

import { ChannelProvider } from '@/components/providers/ChannelProvider'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatLayout } from '@/components/layout/ChatLayout'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ChannelProvider>
      <ChatLayout sidebar={<Sidebar />}>
        {children}
      </ChatLayout>
    </ChannelProvider>
  )
} 