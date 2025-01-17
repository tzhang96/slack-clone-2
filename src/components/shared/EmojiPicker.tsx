'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { Smile } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'

// Dynamically import emoji-mart components
const Picker = dynamic(() => import('@emoji-mart/react'), {
  ssr: false,
  loading: () => null
})

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  disabled?: boolean
}

export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only render picker after component mounts to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        disabled={true}
      >
        <Smile className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
          disabled={disabled}
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        className="w-full border-none p-0 shadow-none"
      >
        <Picker
          data={require('@emoji-mart/data')}
          onEmojiSelect={(emoji: { native: string }) => {
            onEmojiSelect(emoji.native)
            setOpen(false)
          }}
          theme={theme === 'dark' ? 'dark' : 'light'}
          previewPosition="none"
          skinTonePosition="none"
        />
      </PopoverContent>
    </Popover>
  )
} 