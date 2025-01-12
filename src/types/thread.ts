import { Message } from './chat';

export interface ThreadMessage {
  id: string;
  content: string;
  createdAt: string;
  channelId?: string;
  conversationId?: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    lastSeen?: string;
  };
  reactions: ThreadReaction[];
  file?: ThreadFile;
}

export interface ThreadReaction {
  id: string;
  emoji: string;
  userId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    lastSeen?: string;
  };
}

export interface ThreadFile {
  id: string;
  messageId: string;
  bucketPath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  isImage: boolean;
  imageWidth?: number;
  imageHeight?: number;
  createdAt: string;
}

export interface ThreadParticipant {
  id: string;
  threadId: string;
  userId: string;
  lastReadAt: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    fullName: string;
  };
}

export interface Thread {
  parentMessage: Message;
  replyCount: number;
  latestReplyAt: string | null;
  participants: ThreadParticipant[];
  replies: Message[];
}

// Database types
export interface ThreadParticipantRow {
  id: string;
  thread_id: string;
  user_id: string;
  last_read_at: string;
  created_at: string;
} 