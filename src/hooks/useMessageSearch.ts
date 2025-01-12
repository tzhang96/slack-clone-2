import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DbMessage } from '@/types/database';

interface SearchResult extends DbMessage {
  ts_rank: number;
  context_name: string;
  context_type: 'channel' | 'dm';
}

interface UseMessageSearchResult {
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  search: (query: string, channelId?: string) => Promise<void>;
  clearResults: () => void;
}

export function useMessageSearch(): UseMessageSearchResult {
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
          channel_id_param: channelId || null,
          limit_param: 50,
          offset_param: 0
        });

      if (searchError) throw searchError;
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err : new Error('An error occurred while searching'));
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    results,
    isLoading,
    error,
    search,
    clearResults
  };
} 