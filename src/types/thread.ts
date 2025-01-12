import { Message } from './chat';
import { File } from './models';

export interface ThreadMessage {
  id: string;
  content: string;
  createdAt: string;
  channelId: string | null;
  conversationId: string | null;
  user: {
    id: string;
    username: string;
    fullName: string;
    lastSeen: string | null;
    status: string | null;
  };
  reactions: ThreadReaction[];
  file: File | null;
}

export interface ThreadReaction {
  id: string;
  emoji: string;
  userId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    lastSeen: string | null;
    status: string | null;
  };
}

export interface ThreadParticipant {
  id: string;
  threadId: string;
  userId: string;
  lastReadAt: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    lastSeen: string | null;
    status: string | null;
  } | null;
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