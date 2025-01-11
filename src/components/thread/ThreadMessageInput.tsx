import { MessageInput, FileMetadata } from '../chat/MessageInput'

interface ThreadMessageInputProps {
  onSend: (content: string, file?: FileMetadata) => void
  disabled?: boolean
}

export function ThreadMessageInput({ onSend, disabled }: ThreadMessageInputProps) {
  return (
    <div className="flex-shrink-0 bg-white border-t">
      <MessageInput
        onSend={onSend}
        context="thread"
        placeholder="Reply in thread..."
        disabled={disabled}
      />
    </div>
  )
} 