import type { Channel } from '@/types/models'

export interface ChannelValidation {
  length: boolean
  format: boolean
  unique: boolean
  hasContent: boolean
  isValid: boolean
}

export interface DeleteChannelValidation {
  nameMatch: boolean
  isValid: boolean
}

export function validateChannelName(name: string, existingChannels: Channel[]): ChannelValidation {
  const lowercaseName = name.toLowerCase()
  const validations = {
    length: lowercaseName.length >= 3 && lowercaseName.length <= 50,
    format: /^[a-z0-9-]*$/.test(lowercaseName),
    unique: !existingChannels.some(c => c.name === lowercaseName),
    hasContent: lowercaseName.length > 0
  }

  return {
    ...validations,
    isValid: Object.values(validations).every(Boolean)
  }
}

export function validateChannelDeletion(confirmation: string, channelName: string): DeleteChannelValidation {
  return {
    nameMatch: confirmation === channelName,
    isValid: confirmation === channelName
  }
}

export function getChannelNameError(validation: ChannelValidation): string | null {
  if (!validation.hasContent) return 'Channel name is required'
  if (!validation.length) return 'Channel name must be between 3 and 50 characters'
  if (!validation.format) return 'Channel name can only contain lowercase letters, numbers, and hyphens'
  if (!validation.unique) return 'Channel name already exists'
  return null
}

export const CHANNEL_NAME_REQUIREMENTS = [
  'Between 3 and 50 characters',
  'Only lowercase letters, numbers, and hyphens',
  'Must be unique'
] 