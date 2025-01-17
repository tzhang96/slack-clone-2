'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useAuth } from '@/lib/auth'
import { DMConversation } from '@/types/chat'

export function useDMConversations() {
  const [conversations, setConversations] = useState<DMConversation[]>([])
  const [isLoadingDMs, setIsLoadingDMs] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { supabase } = useSupabase()
  const { user } = useAuth()

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) {
        console.log('No user found, skipping fetch')
        return
      }

      console.log('fetchConversations starting')
      try {
        console.log('Fetching conversations for user:', user.id)
        const { data, error } = await supabase
          .from('dm_conversations')
          .select(`
            *,
            user1:user1_id (
              id,
              username,
              full_name,
              status,
              is_bot
            ),
            user2:user2_id (
              id,
              username,
              full_name,
              status,
              is_bot
            )
          `)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('updated_at', { ascending: false })

        console.log('Query result:', { data, error, userId: user.id })

        if (error) {
          console.error('Supabase query error:', error)
          throw error
        }

        if (!data) {
          console.log('No data returned from query')
          setConversations([])
          return
        }

        console.log('Raw conversations data:', data)
        console.log('Transforming data...')
        const transformedData = data
          .map(conversation => {
            try {
              console.log('Processing conversation:', conversation)
              const otherUser = conversation.user1_id === user.id ? conversation.user2 : conversation.user1
              if (!otherUser) {
                console.warn('Missing other user data for conversation:', conversation)
                return null
              }
              console.log('Other user data:', otherUser)
              const transformed: DMConversation = {
                id: conversation.id,
                createdAt: conversation.created_at,
                updatedAt: conversation.updated_at,
                user1: {
                  id: conversation.user1.id,
                  username: conversation.user1.username,
                  fullName: conversation.user1.full_name,
                  status: conversation.user1.status,
                  is_bot: conversation.user1.is_bot || false
                },
                user2: {
                  id: conversation.user2.id,
                  username: conversation.user2.username,
                  fullName: conversation.user2.full_name,
                  status: conversation.user2.status,
                  is_bot: conversation.user2.is_bot || false
                },
                user1_id: conversation.user1_id,
                user2_id: conversation.user2_id,
                otherUser: {
                  id: otherUser.id,
                  username: otherUser.username,
                  fullName: otherUser.full_name,
                  status: otherUser.status,
                  is_bot: otherUser.is_bot || false
                }
              }
              return transformed
            } catch (err) {
              console.error('Error transforming conversation:', err, conversation)
              return null
            }
          })
          .filter((conv): conv is DMConversation => conv !== null)

        console.log('Transformed conversations:', transformedData)
        setConversations(transformedData)
      } catch (err) {
        console.error('Error in fetchConversations:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch conversations'))
      } finally {
        setIsLoadingDMs(false)
      }
    }

    fetchConversations()

    // Subscribe to changes
    const channel = supabase
      .channel('dm_conversations_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dm_conversations',
        filter: `user1_id=eq.${user?.id}`,
      }, fetchConversations)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dm_conversations',
        filter: `user2_id=eq.${user?.id}`,
      }, fetchConversations)
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, user])

  return { conversations, isLoadingDMs, error }
} 