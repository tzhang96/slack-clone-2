export default function ChannelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

// Disable static generation for this layout
export const dynamic = 'force-dynamic' 