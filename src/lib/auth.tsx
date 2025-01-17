'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PUBLIC_ROUTES = ['/login', '/signup']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname() || ''

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setUser(user)
        setLoading(false)
      } catch (error) {
        console.error('Error checking user:', error)
        setUser(null)
        setLoading(false)
      }
    }

    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!error && user) {
          setUser(user)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
          },
        },
      })

      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error('No user returned from signup')
      }

      // Add a small delay to ensure auth is fully processed
      await new Promise(resolve => setTimeout(resolve, 500))

      // Then, create the user record in our database
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          username: username,
          full_name: fullName,
        })

      if (dbError) {
        // Check if the error is due to the profile already existing
        const { data: existingProfile } = await supabase
          .from('users')
          .select()
          .eq('id', authData.user.id)
          .single()

        // Only throw an error if the profile doesn't exist
        if (!existingProfile) {
          console.error('Database error:', dbError)
          await supabase.auth.signOut()
          throw new Error(dbError.message || 'Failed to create user profile')
        }
      }

      // Verify user after signup
      const { data: { user: verifiedUser } } = await supabase.auth.getUser()
      setUser(verifiedUser)
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        // If the error is just that the profile already exists, we can ignore it
        return
      }
      console.error('Error in signup:', error)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    // Verify user after sign in
    const { data: { user: verifiedUser } } = await supabase.auth.getUser()
    setUser(verifiedUser)
  }

  const signOut = async () => {
    try {
      if (user) {
        // Set status to offline before signing out
        await supabase
          .from('users')
          .update({ 
            status: 'offline',
            last_seen: new Date().toISOString()
          })
          .eq('id', user.id)
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Clear any local state
      setUser(null)
      
      // Force a router refresh and redirect
      router.refresh()
      router.replace('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  // Don't render children until initial session is checked
  if (loading) {
    return null
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 