import type { 
  DbUser, 
  DbMessage, 
  DbReaction, 
  DbFile, 
  DbThreadParticipant,
  DbJoinedMessage,
  DbJoinedUser,
  DbJoinedReaction,
  DbJoinedThreadParticipant,
  DbJoinedFile
} from '@/types/database'
import type { User, Message, Reaction, File, ThreadParticipant } from '@/types/models'

export class DataTransformer {
  static toUser(dbUser: DbUser | DbJoinedUser | null | undefined, fallbackId?: string): User {
    if (!dbUser) {
      return {
        id: fallbackId || 'unknown',
        username: 'Unknown',
        fullName: 'Unknown User',
        lastSeen: undefined,
        status: 'offline'
      }
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      fullName: dbUser.full_name,
      lastSeen: dbUser.last_seen || undefined,
      status: dbUser.status || 'offline'
    }
  }

  static toFile(dbFile: DbFile | DbJoinedFile): File {
    console.log('Transforming file:', {
      id: dbFile.id,
      messageId: dbFile.message_id,
      bucketPath: dbFile.bucket_path
    })

    return {
      id: dbFile.id,
      messageId: dbFile.message_id,
      userId: dbFile.user_id,
      bucketPath: dbFile.bucket_path,
      fileName: dbFile.file_name,
      fileSize: dbFile.file_size,
      contentType: dbFile.content_type,
      isImage: dbFile.is_image,
      imageWidth: dbFile.image_width || undefined,
      imageHeight: dbFile.image_height || undefined,
      createdAt: dbFile.created_at
    }
  }

  static toReaction(dbReaction: DbJoinedReaction): Reaction | null {
    // Ensure we have user data
    const user = dbReaction.users[0]
    if (!user) return null

    return {
      id: dbReaction.id,
      emoji: dbReaction.emoji,
      userId: dbReaction.user_id,
      user: this.toUser(user)
    }
  }

  static toThreadParticipant(dbParticipant: DbJoinedThreadParticipant & { thread_id: string }): ThreadParticipant {
    return {
      id: dbParticipant.id,
      threadId: dbParticipant.thread_id,
      userId: dbParticipant.user_id,
      lastReadAt: dbParticipant.last_read_at,
      createdAt: dbParticipant.created_at,
      user: dbParticipant.users[0] ? this.toUser(dbParticipant.users[0]) : undefined
    }
  }

  static toMessage(dbMessage: DbJoinedMessage): Message | null {
    // Handle both array and object user data from joins
    const user = Array.isArray(dbMessage.users) ? dbMessage.users[0] : dbMessage.users
    if (!user) return null

    return {
      id: dbMessage.id,
      content: dbMessage.content,
      createdAt: dbMessage.created_at,
      channelId: dbMessage.channel_id || undefined,
      conversationId: dbMessage.conversation_id || undefined,
      parentMessageId: dbMessage.parent_message_id || undefined,
      replyCount: dbMessage.reply_count || 0,
      latestReplyAt: dbMessage.latest_reply_at,
      isThreadParent: dbMessage.is_thread_parent || false,
      user: this.toUser(user),
      reactions: dbMessage.reactions
        ?.map(r => this.toReaction(r))
        .filter((r): r is Reaction => r !== null) || [],
      file: dbMessage.files?.[0] ? this.toFile(dbMessage.files[0]) : undefined,
      threadParticipants: dbMessage.thread_participants
        ?.map(p => this.toThreadParticipant({ ...p, thread_id: dbMessage.id })) || []
    }
  }
} 