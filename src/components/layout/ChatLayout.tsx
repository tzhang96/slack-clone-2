'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

interface ChatLayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function ChatLayout({ sidebar, children }: ChatLayoutProps) {
  return (
    <div className="flex h-screen w-full">
      <div className="w-64 bg-white border-r border-gray-200">
        {sidebar}
      </div>

      <div className="flex-1 bg-gray-50">
        {children}
      </div>
    </div>
  )
} 