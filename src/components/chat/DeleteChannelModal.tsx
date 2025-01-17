import { useState } from 'react'
import { useChannelContext } from '@/components/providers/ChannelProvider'
import { validateChannelDeletion } from '@/lib/utils/channelValidation'
import { X } from 'lucide-react'

interface DeleteChannelModalProps {
  isOpen: boolean
  onClose: () => void
  channel: { id: string; name: string } | null
}

export function DeleteChannelModal({ isOpen, onClose, channel }: DeleteChannelModalProps) {
  const { deleteChannel } = useChannelContext()
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const validation = channel 
    ? validateChannelDeletion(deleteConfirmation, channel.name)
    : { nameMatch: false, isValid: false }

  const handleDelete = async () => {
    if (!channel || !validation.isValid) return

    setDeleteError(null)
    setIsDeleting(true)

    try {
      await deleteChannel(channel.id)
      onClose()
      setDeleteConfirmation('')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete channel')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen || !channel) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Delete Channel</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>#{channel.name}</strong>? This action cannot be undone.
          </p>
          <p className="mt-4 text-gray-700">
            To confirm, type <strong>{channel.name}</strong> below:
          </p>
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            className="w-full px-3 py-2 mt-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 bg-white"
            placeholder={channel.name}
            disabled={isDeleting}
          />
        </div>

        {deleteError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {deleteError}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
            disabled={!validation.isValid || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Channel'}
          </button>
        </div>
      </div>
    </div>
  )
} 