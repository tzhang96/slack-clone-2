'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { LogOut, Search, Sparkles } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { SearchModal } from '@/components/search/SearchModal'
import { AISearchModal } from '@/components/search/AISearchModal'

export function Header() {
  const { user, signOut } = useAuth()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAISearchOpen, setIsAISearchOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const displayName = user?.user_metadata?.full_name || user?.email || ''

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 z-50">
        {/* App name */}
        <div className="text-xl font-bold text-white">
          sl<span className="text-blue-400">ai</span>ck
        </div>

        {/* Search and user controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            aria-label="Search messages"
          >
            <Search size={20} />
          </button>

          <button
            onClick={() => setIsAISearchOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors flex items-center gap-1"
            aria-label="Ask AI"
          >
            <Sparkles size={20} />
            <span className="text-sm">Ask AI</span>
          </button>
          
          <div className="flex items-center gap-2">
            <UserAvatar 
              userId={user?.id || ''} 
              name={displayName}
            />
            <div className="text-sm text-gray-300">
              {displayName}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <SearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <AISearchModal
        isOpen={isAISearchOpen}
        onClose={() => setIsAISearchOpen(false)}
      />
    </>
  )
} 