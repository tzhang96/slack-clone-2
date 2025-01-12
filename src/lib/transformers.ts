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
import type { User, Message, File, ThreadParticipant } from '@/types/models'
import type { ReactionWithUser } from '@/types/supabase'

export class DataTransformer {
  static toUser(dbUser: DbUser | DbJoinedUser | null | undefined, fallbackId?: string): User {
    if (!dbUser) {
      return {
        id: fallbackId || 'unknown',
        username: 'Unknown',
        fullName: 'Unknown User',
        lastSeen: null,
        status: 'offline'
      }
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      fullName: dbUser.full_name,
      lastSeen: dbUser.last_seen,
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
      imageWidth: dbFile.image_width || null,
      imageHeight: dbFile.image_height || null,
      createdAt: dbFile.created_at
    }
  }

  static toReaction(dbReaction: DbJoinedReaction): ReactionWithUser | null {
    // Ensure we have user data
    const user = dbReaction.users[0]
    if (!user) return null

    return {
      id: dbReaction.id,
      emoji: dbReaction.emoji,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name
      }
    }
  }

  static toThreadParticipant(dbParticipant: DbJoinedThreadParticipant): ThreadParticipant {
    return {
      id: dbParticipant.id,
      threadId: dbParticipant.thread_id,
      userId: dbParticipant.user_id,
      lastReadAt: dbParticipant.last_read_at,
      createdAt: dbParticipant.created_at,
      user: dbParticipant.users[0] ? this.toUser(dbParticipant.users[0]) : null
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
      channelId: dbMessage.channel_id,
      conversationId: dbMessage.conversation_id,
      parentMessageId: dbMessage.parent_message_id,
      replyCount: dbMessage.reply_count || 0,
      latestReplyAt: dbMessage.latest_reply_at || null,
      isThreadParent: dbMessage.is_thread_parent || false,
      user: this.toUser(user),
      reactions: dbMessage.reactions
        ?.map(r => this.toReaction(r))
        .filter((r): r is ReactionWithUser => r !== null) || [],
      file: dbMessage.files?.[0] ? this.toFile(dbMessage.files[0]) : null,
      threadParticipants: dbMessage.thread_participants
        ?.map(p => this.toThreadParticipant(p)) || null
    }
  }
} 