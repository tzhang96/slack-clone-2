'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useChannelContext } from '@/components/providers/ChannelProvider'
import { Hash, Plus, Check, X, MoreVertical, Trash2 } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

export function ChannelList() {
  const context = useChannelContext()
  console.log('ChannelContext values:', {
    hasDeleteChannel: typeof context.deleteChannel === 'function',
    contextKeys: Object.keys(context)
  })
  
  const { channels, isLoading, error, createChannel, deleteChannel } = context
  const params = useParams()
  const currentChannel = params?.channelId as string
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<{ id: string, name: string } | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [channelName, setChannelName] = useState('')
  const [description, setDescription] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const validation = useMemo(() => {
    const lowercaseName = channelName.toLowerCase()
    const validations = {
      length: lowercaseName.length >= 3 && lowercaseName.length <= 50,
      format: /^[a-z0-9-]*$/.test(lowercaseName),
      unique: !channels.some(c => c.name === lowercaseName),
      hasContent: lowercaseName.length > 0
    }
    return {
      ...validations,
      isValid: Object.values(validations).every(Boolean)
    }
  }, [channelName, channels])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setIsCreating(true)

    try {
      await createChannel(channelName.toLowerCase(), description)
      setIsModalOpen(false)
      setChannelName('')
      setDescription('')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClick = (channel: { id: string, name: string }) => {
    console.log('Delete clicked for channel:', channel)
    setChannelToDelete(channel)
    setIsDeleteModalOpen(true)
    setDeleteConfirmation('')
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!channelToDelete) {
      console.error('No channel selected for deletion')
      return
    }
    
    try {
      console.log('Confirming deletion of channel:', {
        id: channelToDelete.id,
        name: channelToDelete.name,
        confirmation: deleteConfirmation
      })

      if (!deleteChannel) {
        console.error('Delete channel function is not available')
        throw new Error('Delete channel function is not available')
      }

      console.log('Calling deleteChannel with ID:', channelToDelete.id)
      await deleteChannel(channelToDelete.id)
      
      console.log('Channel deleted successfully')
      setIsDeleteModalOpen(false)
      setChannelToDelete(null)
      setDeleteConfirmation('')
    } catch (err) {
      console.error('Error in handleDeleteConfirm:', err)
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        })
      }
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete channel')
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-gray-400 mb-4">Loading channels...</div>
        <div className="h-6 bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-6 bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-6 bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-400 mb-2">Failed to load channels</div>
        <div className="text-gray-500 text-sm">{error.message}</div>
      </div>
    )
  }

  if (!channels || channels.length === 0) {
    return (
      <div className="p-4 text-gray-400">
        No channels found
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="px-4 mb-2 flex items-center justify-between">
        <h2 className="text-gray-400 uppercase text-sm font-semibold">
          Channels ({channels.length})
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Create new channel"
        >
          <Plus className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-1">
        {channels.map(channel => (
          <div
            key={channel.id}
            className="group relative"
            onMouseEnter={() => setHoveredChannel(channel.id)}
            onMouseLeave={() => setHoveredChannel(null)}
          >
            <Link
              href={`/chat/${channel.name}`}
              className={`
                flex items-center px-4 py-1.5 rounded-md hover:bg-gray-700 transition-colors
                ${currentChannel === channel.name ? 'bg-gray-700 text-white' : 'text-gray-300'}
              `}
            >
              <Hash className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{channel.name}</span>
            </Link>
            {hoveredChannel === channel.id && channel.name !== 'general' && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteClick(channel)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-600 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative z-50">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Create New Channel</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                      channelName && !validation.isValid ? 'border-red-300' : ''
                    }`}
                    placeholder="e.g. announcements"
                    required
                  />
                  <div className="mt-1 space-y-1">
                    {validation.hasContent && (
                      <div className="text-sm space-y-1">
                        {!validation.length && (
                          <p className="flex items-center gap-1 text-red-500">
                            <X className="w-4 h-4" />
                            Must be between 3 and 50 characters
                          </p>
                        )}
                        {!validation.format && (
                          <p className="flex items-center gap-1 text-red-500">
                            <X className="w-4 h-4" />
                            Only lowercase letters, numbers, and hyphens
                          </p>
                        )}
                        {!validation.unique && (
                          <p className="flex items-center gap-1 text-red-500">
                            <X className="w-4 h-4" />
                            Channel name must be unique
                          </p>
                        )}
                      </div>
                    )}
                    {channelName && channelName !== channelName.toLowerCase() && (
                      <p className="text-sm text-blue-600">
                        Will be created as: #{channelName.toLowerCase()}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="What's this channel about?"
                  />
                </div>
                {createError && (
                  <div className="text-red-500 text-sm">{createError}</div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !validation.isValid}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create Channel'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && channelToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Delete Channel</h2>
            <div className="space-y-2 mb-4">
              <p className="text-gray-600">
                Are you sure you want to delete <strong>#{channelToDelete.name}</strong>?
              </p>
              <p className="text-red-600 text-sm">
                This will permanently delete:
              </p>
              <ul className="list-disc list-inside mt-1 ml-2 text-red-600 text-sm">
                <li>The channel and its settings</li>
                <li>All messages in the channel</li>
              </ul>
              <p className="text-red-600 text-sm mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <strong>{channelToDelete.name}</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder={channelToDelete.name}
              />
            </div>
            {deleteError && (
              <div className="mb-4 text-sm text-red-600">{deleteError}</div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setChannelToDelete(null)
                  setDeleteConfirmation('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmation !== channelToDelete.name}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 