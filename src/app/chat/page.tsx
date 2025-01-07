'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/chat/general') // Redirect to general channel
  }, [router])

  return null // No need to render anything as we're redirecting
} 