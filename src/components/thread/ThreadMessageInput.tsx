import { MessageInput } from '../chat/MessageInput'
import { FileMetadata } from '@/hooks/useFileUpload'

interface ThreadMessageInputProps {
  onSend: (content: string, file: FileMetadata | null) => Promise<void>
  disabled?: boolean
}

export function ThreadMessageInput({ onSend, disabled }: ThreadMessageInputProps) {
  const handleSend = async (content: string, file: FileMetadata | null) => {
    await onSend(content, file)
  }

  return (
    <MessageInput
      onSend={handleSend}
      context="thread"
      disabled={disabled}
      placeholder="Reply in thread..."
    />
  )
} 