'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MessageSearch from '@/components/MessageSearch'

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams?.get('q') || ''

  useEffect(() => {
    if (!query) {
      router.push('/chat')
    }
  }, [query, router])

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="flex-1 container mx-auto px-4 py-8">
        <MessageSearch />
      </div>
    </div>
  )
} 