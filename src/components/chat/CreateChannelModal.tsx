import { useState } from 'react'
import { useChannelContext } from '@/components/providers/ChannelProvider'
import { validateChannelName, getChannelNameError, CHANNEL_NAME_REQUIREMENTS } from '@/lib/utils/channelValidation'
import { X } from 'lucide-react'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateChannelModal({ isOpen, onClose }: CreateChannelModalProps) {
  const { channels, createChannel } = useChannelContext()
  const [channelName, setChannelName] = useState('')
  const [description, setDescription] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const validation = validateChannelName(channelName, channels)
  const nameError = getChannelNameError(validation)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validation.isValid) return

    setCreateError(null)
    setIsCreating(true)

    try {
      await createChannel(channelName.toLowerCase(), description)
      onClose()
      setChannelName('')
      setDescription('')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create a Channel</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div className="mb-4">
            <label htmlFor="channelName" className="block text-sm font-medium text-gray-700 mb-1">
              Channel Name
            </label>
            <input
              type="text"
              id="channelName"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. project-updates"
              disabled={isCreating}
            />
            {nameError && (
              <p className="mt-1 text-sm text-red-600">{nameError}</p>
            )}
            <div className="mt-2">
              <p className="text-sm text-gray-600 font-medium">Channel names must be:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                {CHANNEL_NAME_REQUIREMENTS.map((req) => (
                  <li key={req}>{req}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What's this channel about?"
              disabled={isCreating}
            />
          </div>

          {createError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={!validation.isValid || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 