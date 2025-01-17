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
        status: 'offline',
        is_bot: false
      }
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      fullName: dbUser.full_name,
      lastSeen: dbUser.last_seen,
      status: dbUser.status || 'offline',
      is_bot: dbUser.is_bot || false
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
    // Safely handle missing users array
    if (!dbReaction.users || !Array.isArray(dbReaction.users) || dbReaction.users.length === 0) {
      return {
        id: dbReaction.id,
        emoji: dbReaction.emoji,
        user: {
          id: 'unknown',
          username: 'Unknown',
          full_name: 'Unknown User',
          is_bot: false
        }
      }
    }

    const user = dbReaction.users[0]
    return {
      id: dbReaction.id,
      emoji: dbReaction.emoji,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        is_bot: user.is_bot || false
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
    
    // Create default user if no user data is available
    const messageUser = user ? {
      id: dbMessage.user_id,
      username: user.username,
      fullName: user.full_name,
      lastSeen: user.last_seen,
      status: user.status || 'offline',
      is_bot: user.is_bot || false
    } : {
      id: dbMessage.user_id,
      username: 'Unknown',
      fullName: 'Unknown User',
      lastSeen: null,
      status: 'offline',
      is_bot: false
    }

    return {
      id: dbMessage.id,
      content: dbMessage.content,
      createdAt: dbMessage.created_at,
      user_id: dbMessage.user_id,
      channelId: dbMessage.channel_id,
      conversationId: dbMessage.conversation_id,
      parentMessageId: dbMessage.parent_message_id,
      replyCount: dbMessage.reply_count || 0,
      latestReplyAt: dbMessage.latest_reply_at || null,
      isThreadParent: dbMessage.is_thread_parent || false,
      user: messageUser,
      reactions: dbMessage.reactions
        ?.map(r => this.toReaction(r))
        .filter((r): r is ReactionWithUser => r !== null) || [],
      file: dbMessage.files?.[0] ? this.toFile(dbMessage.files[0]) : null,
      threadParticipants: dbMessage.thread_participants
        ?.map(p => this.toThreadParticipant(p)) || null
    }
  }
} 