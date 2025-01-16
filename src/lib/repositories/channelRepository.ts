import { supabase } from '@/lib/supabase'
import { DataTransformer } from '@/lib/transformers'
import type { Channel } from '@/types/models'

export const CHANNEL_SELECT = `
  id,
  name,
  description,
  created_at
`

export class ChannelRepository {
  static async getChannels(): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select(CHANNEL_SELECT)
      .order('name')

    if (error) throw error
    return data.map(channel => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      createdAt: channel.created_at
    }))
  }

  static async getChannelByName(name: string): Promise<Channel | null> {
    const { data, error } = await supabase
      .from('channels')
      .select(CHANNEL_SELECT)
      .eq('name', name)
      .single()

    if (error || !data) return null
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at
    }
  }

  static async createChannel(name: string, description?: string): Promise<Channel> {
    const { data, error } = await supabase
      .from('channels')
      .insert({ name, description })
      .select(CHANNEL_SELECT)
      .single()

    if (error) throw error
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at
    }
  }

  static async deleteChannel(channelId: string): Promise<void> {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId)

    if (error) throw error
  }
} 