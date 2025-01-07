'use client'

import { ReactNode } from 'react'
import { Header } from './Header'

interface ChatLayoutProps {
  children: ReactNode
  sidebar: ReactNode
}

export function ChatLayout({ children, sidebar }: ChatLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14">
        <aside className="w-64 bg-gray-900 border-r border-gray-700 flex-shrink-0">
          {sidebar}
        </aside>

        <main className="flex-1 bg-white overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
} 