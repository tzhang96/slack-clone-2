'use client'

import { ReactNode } from 'react'
import { Header } from './Header'

interface ChatLayoutProps {
  children: ReactNode
  sidebar: ReactNode
}

export function ChatLayout({ children, sidebar }: ChatLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14 overflow-hidden">
        <aside className="w-64 bg-gray-900 border-r border-gray-700 flex-shrink-0 overflow-y-auto">
          {sidebar}
        </aside>

        <main className="flex-1 bg-white overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
} 