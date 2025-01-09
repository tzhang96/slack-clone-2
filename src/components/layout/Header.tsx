'use client'

import { useAuth } from '@/lib/auth'
import { LogOut } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'

export function Header() {
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const displayName = user?.user_metadata?.full_name || user?.email || ''

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 z-50">
      {/* App name */}
      <div className="text-xl font-bold text-white">
        sl<span className="text-blue-400">ai</span>ck
      </div>

      {/* User info and logout */}
      <div className="flex items-center gap-4">
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
  )
} 