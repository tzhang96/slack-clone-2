import { ChatLayout } from '@/components/layout/ChatLayout'
import { ChannelList } from '@/components/chat/ChannelList'
import { ChatLoading } from '@/components/chat/ChatLoading'

export default function Loading() {
  return (
    <ChatLayout sidebar={<ChannelList />}>
      <ChatLoading />
    </ChatLayout>
  )
} 