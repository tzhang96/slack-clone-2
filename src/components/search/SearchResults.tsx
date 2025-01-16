import { Hash, Users, MessageSquare } from 'lucide-react';
import { type SearchResult } from '@/hooks/useMessageSearch';
import { formatDistanceToNow } from 'date-fns';

interface SearchResultsProps {
  results: SearchResult[];
  onResultClick: (result: SearchResult) => void;
}

export function SearchResults({ results, onResultClick }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No results found
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {results.map((message) => (
        <div
          key={message.id}
          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          onClick={() => onResultClick(message)}
        >
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              {message.contextType === 'channel' ? (
                <>
                  <Hash className="w-4 h-4 mr-1" />
                  {message.contextName}
                </>
              ) : message.contextType === 'dm' ? (
                <>
                  <Users className="w-4 h-4 mr-1" />
                  {message.contextName}
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Thread in {message.contextName}
                </>
              )}
              <span className="mx-2">•</span>
              <span>{formatDistanceToNow(new Date(message.createdAt))} ago</span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {message.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 