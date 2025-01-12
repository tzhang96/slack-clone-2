import { format } from 'date-fns';
import { MessageSquare, Hash, Users } from 'lucide-react';
import Link from 'next/link';
import { DbMessage } from '@/types/database';

interface SearchResult extends DbMessage {
  ts_rank: number;
  context_name: string;
  context_type: 'channel' | 'dm';
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onResultClick: (messageId: string) => void;
}

export const SearchResults = ({ results, isLoading, onResultClick }: SearchResultsProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <MessageSquare className="h-12 w-12 mb-2" />
        <p>No messages found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
      {results.map((message) => (
        <button
          key={message.id}
          onClick={() => onResultClick(message.id)}
          className="flex flex-col p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>{format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}</span>
            <span>•</span>
            {message.context_type === 'channel' ? (
              <Link
                href={`/channels/${message.channel_id}`}
                className="flex items-center gap-1 hover:text-blue-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Hash className="h-3.5 w-3.5" />
                {message.context_name}
              </Link>
            ) : (
              <Link
                href={`/dm/${message.conversation_id}`}
                className="flex items-center gap-1 hover:text-blue-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Users className="h-3.5 w-3.5" />
                {message.context_name}
              </Link>
            )}
          </div>
          <p className="mt-1 text-gray-900 dark:text-gray-100">{message.content}</p>
        </button>
      ))}
    </div>
  );
}; 