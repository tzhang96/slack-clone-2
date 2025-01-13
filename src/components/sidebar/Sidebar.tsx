'use client'

import { useAuth } from '@/lib/auth'
import { useParams } from 'next/navigation'
import { useDMConversations } from '@/hooks/useDMConversations'
import { DMConversation } from '@/types/chat'
import { UserAvatar } from '@/components/shared/UserAvatar'
import Link from 'next/link'
import { ChannelList } from '@/components/chat/ChannelList'

export function Sidebar() {
  const { conversations, isLoadingDMs, error } = useDMConversations()
  const { user: currentUser } = useAuth()
  const params = useParams()
  const currentDM = params?.conversationId as string

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      {/* Channels section */}
      <div className="flex-shrink-0">
        <ChannelList />
      </div>

      {/* DMs section */}
      <div className="mt-6 flex-1 min-h-0">
        <div className="px-4 mb-2">
          <h2 className="text-gray-400 uppercase text-sm font-semibold">
            Direct Messages {conversations?.length ? `(${conversations.length})` : ''}
          </h2>
        </div>

        <div className="space-y-1 px-2 overflow-y-auto">
          {isLoadingDMs ? (
            <div className="px-2">
              <div className="h-8 bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-8 bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-8 bg-gray-700 rounded animate-pulse" />
            </div>
          ) : error ? (
            <div className="px-2 text-red-400 text-sm">
              Failed to load conversations
            </div>
          ) : conversations?.length === 0 ? (
            <div className="px-2 text-gray-400 text-sm">
              No conversations yet
            </div>
          ) : (
            conversations?.map((conv) => {
              const otherUser = conv.otherUser
              
              return (
                <Link
                  key={conv.id}
                  href={`/dm/${conv.id}`}
                  className={`
                    flex items-center px-2 py-1.5 rounded-md hover:bg-gray-700 transition-colors
                    ${currentDM === conv.id ? 'bg-gray-700 text-white' : 'text-gray-300'}
                  `}
                >
                  <UserAvatar
                    userId={otherUser.id}
                    name={otherUser.fullName}
                    showStatus
                    size="sm"
                  />
                  <div className="ml-2 min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="truncate text-sm font-medium">
                        {otherUser.fullName}
                      </p>
                      {otherUser.status && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {otherUser.status}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
} 