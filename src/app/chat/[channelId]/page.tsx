import { ChannelPageClient } from './ChannelPageClient'

export function generateStaticParams() {
  return []
}

export default function ChannelPage(props: { params: { channelId: string } }) {
  return <ChannelPageClient {...props} />
} 