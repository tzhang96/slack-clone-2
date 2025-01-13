import { Hash, Users, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { type SearchResult } from '@/hooks/useMessageSearch';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onResultClick: (result: SearchResult) => void;
}

export function SearchResults({ results, isLoading, onResultClick }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No results found
      </div>
    );
  }

  return (
    <div className="divide-y">
      {results.map(message => (
        <button
          key={message.id}
          onClick={() => onResultClick(message)}
          className="flex flex-col w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            {message.context_type === 'channel' ? (
              <>
                <Hash className="h-4 w-4" />
                <span>{message.context_name}</span>
              </>
            ) : message.context_type === 'dm' ? (
              <>
                <Users className="h-4 w-4" />
                <span>{message.context_name}</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                <span>Thread in {message.context_name}</span>
              </>
            )}
            <span className="mx-2">•</span>
            <span>{formatDistanceToNow(new Date(message.created_at))} ago</span>
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100">
            {message.content}
          </div>
          {message.is_thread_parent && (
            <div className="text-xs text-gray-500 mt-1">
              {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
            </div>
          )}
        </button>
      ))}
    </div>
  );
} 