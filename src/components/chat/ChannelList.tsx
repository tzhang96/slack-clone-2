'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useChannelContext } from '@/components/providers/ChannelProvider'
import { Hash, Plus, MoreVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CreateChannelModal } from './CreateChannelModal'
import { DeleteChannelModal } from './DeleteChannelModal'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ChannelListSkeleton } from './ChannelListSkeleton'

function ChannelListContent() {
  const { channels, isLoading, error } = useChannelContext()
  const params = useParams()
  const currentChannel = params?.channelId as string
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<{ id: string, name: string } | null>(null)
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null)

  const handleDeleteClick = (channel: { id: string, name: string }) => {
    setChannelToDelete(channel)
    setIsDeleteModalOpen(true)
  }

  if (error) {
    return (
      <div className="px-4 py-2 text-red-500">
        Failed to load channels
      </div>
    )
  }

  if (isLoading) {
    return <ChannelListSkeleton />
  }

  return (
    <div>
      <div className="px-4 mb-2 flex items-center justify-between">
        <h2 className="text-gray-400 uppercase text-sm font-semibold">
          Channels {channels?.length ? `(${channels.length})` : ''}
        </h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          aria-label="Create Channel"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-1 px-2">
        {channels?.length === 0 ? (
          <div className="px-2 text-gray-400 text-sm">
            No channels yet
          </div>
        ) : (
          channels?.map((channel) => (
            <div
              key={channel.id}
              className="relative group"
              onMouseEnter={() => setHoveredChannel(channel.id)}
              onMouseLeave={() => setHoveredChannel(null)}
            >
              <Link
                href={`/chat/${channel.name}`}
                className={`
                  flex items-center px-2 py-1.5 rounded-md hover:bg-gray-700 transition-colors
                  ${currentChannel === channel.name ? 'bg-gray-700 text-white' : 'text-gray-300'}
                `}
              >
                <Hash size={18} className="mr-2 flex-shrink-0" />
                <span className="truncate">{channel.name}</span>
              </Link>

              {hoveredChannel === channel.id && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleDeleteClick(channel)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Channel options"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <DeleteChannelModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setChannelToDelete(null)
        }}
        channel={channelToDelete}
      />
    </div>
  )
}

export function ChannelList() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 text-red-500">
          <h3 className="font-semibold mb-2">Failed to load channels</h3>
          <p className="text-sm">Please try refreshing the page</p>
        </div>
      }
    >
      <ChannelListContent />
    </ErrorBoundary>
  )
} 