import { Message } from './chat';
import { Database } from './supabase';

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

// Add thread-related types to Database interface
declare module './supabase' {
  interface Database {
    public: {
      Tables: {
        thread_participants: {
          Row: ThreadParticipantRow;
          Insert: Omit<ThreadParticipantRow, 'id' | 'created_at'>;
          Update: Partial<Omit<ThreadParticipantRow, 'id' | 'created_at'>>;
        };
      };
    };
  }
} 