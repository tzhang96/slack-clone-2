'use client'

import { ChatError } from '@/components/chat/ChatError'
import { ChatLayout } from '@/components/layout/ChatLayout'
import { ChannelList } from '@/components/chat/ChannelList'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <ChatLayout sidebar={<ChannelList />}>
      <ChatError error={error} reset={reset} />
    </ChatLayout>
  )
} 