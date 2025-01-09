import { supabase } from './supabase'

export interface Channel {
  id: string
  name: string
  description: string
}

export const defaultChannels: Omit<Channel, 'id'>[] = [
  {
    name: 'general',
    description: 'General discussion for everyone'
  },
  {
    name: 'random',
    description: 'Random topics and casual chat'
  },
  {
    name: 'introductions',
    description: 'Introduce yourself to the community'
  }
]

async function initializeDefaultChannels() {
  // Check if channels exist
  const { data: existingChannels, error: fetchError } = await supabase
    .from('channels')
    .select('name')

  if (fetchError) {
    console.error('Error checking existing channels:', fetchError)
    return
  }

  // If no channels exist, create the default ones
  if (!existingChannels || existingChannels.length === 0) {
    const { error: insertError } = await supabase
      .from('channels')
      .insert(defaultChannels)

    if (insertError) {
      console.error('Error creating default channels:', insertError)
    }
  }
}

// Main initialization function that sets up all required data
export async function initializeData() {
  await initializeDefaultChannels()
  // Add any other initialization steps here
} 