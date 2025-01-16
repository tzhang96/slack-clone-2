import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DbMessage } from '@/types/database';
import { useAuth } from '@/lib/auth';

// Base search result from database
interface DbSearchResult extends DbMessage {
  ts_rank: number;
  context_name: string;
  context_type: 'channel' | 'dm' | 'thread';
  channel_name: string | null;
}

// Transformed search result for frontend use
export interface SearchResult {
  id: string;
  content: string;
  createdAt: string;
  channelId: string | null;
  conversationId: string | null;
  parentMessageId: string | null;
  userId: string;
  replyCount: number;
  latestReplyAt: string | null;
  isThreadParent: boolean;
  tsRank: number;
  contextName: string;
  contextType: 'channel' | 'dm' | 'thread';
  channelName: string | null;
}

interface UseMessageSearchResult {
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  search: (query: string, channelId?: string) => Promise<void>;
  clearResults: () => void;
}

function transformSearchResult(dbResult: DbSearchResult): SearchResult {
  return {
    id: dbResult.id,
    content: dbResult.content,
    createdAt: dbResult.created_at,
    channelId: dbResult.channel_id,
    conversationId: dbResult.conversation_id,
    parentMessageId: dbResult.parent_message_id,
    userId: dbResult.user_id,
    replyCount: dbResult.reply_count || 0,
    latestReplyAt: dbResult.latest_reply_at,
    isThreadParent: dbResult.is_thread_parent || false,
    tsRank: dbResult.ts_rank,
    contextName: dbResult.context_name,
    contextType: dbResult.context_type,
    channelName: dbResult.channel_name
  };
}

export function useMessageSearch(): UseMessageSearchResult {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  const search = async (query: string, channelId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setResults([]);
        return;
      }

      const { data, error: searchError } = await supabase
        .rpc('search_messages', {
          search_query: trimmedQuery,
          searching_user_id: user?.id,
          limit_val: 50,
          channel_id_filter: channelId || null
        });

      if (searchError) throw searchError;

      setResults(data ? data.map(transformSearchResult) : []);
    } catch (err) {
      console.error('Error searching messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to search messages'));
    } finally {
      setIsLoading(false);
    }
  };

  return { results, isLoading, error, search, clearResults };
} 