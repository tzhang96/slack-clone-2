'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/chat' : '/login')
    }
  }, [user, loading, router])

  // Show nothing while checking auth status
  return null
} 