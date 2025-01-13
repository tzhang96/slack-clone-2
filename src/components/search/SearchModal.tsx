import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SearchBar } from './SearchBar';
import { SearchResults } from './SearchResults';
import { useMessageSearch, type SearchResult } from '@/hooks/useMessageSearch';
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const router = useRouter();
  const { results, isLoading, error, search, clearResults } = useMessageSearch();
  const [searchTerm, setSearchTerm] = useState('');
  const [shouldPersist, setShouldPersist] = useState(false);

  const handleCleanup = useCallback(() => {
    if (!shouldPersist) {
      setSearchTerm('');
      clearResults();
    }
    setShouldPersist(false);
  }, [shouldPersist, clearResults]);

  // Clear results when modal is closed
  useEffect(() => {
    if (!isOpen) {
      handleCleanup();
    }
  }, [isOpen, handleCleanup]);

  const handleSearch = useCallback((query: string) => {
    setSearchTerm(query);
    search(query);
  }, [search]);

  const handleResultClick = useCallback((result: SearchResult) => {
    // Keep the search results when closing the modal via result click
    setShouldPersist(true);
    onClose();

    // Navigate to the appropriate context
    let path;
    if (result.context_type === 'thread') {
      // For thread messages, navigate to the parent message's channel
      path = result.channel_id 
        ? `/chat/${result.channel_name}` 
        : `/dm/${result.conversation_id}`;
    } else {
      path = result.context_type === 'channel' 
        ? `/chat/${result.channel_name}`
        : `/dm/${result.conversation_id}`;
    }

    // Add message ID as a URL hash for jumping
    // For thread messages, jump to the parent message and add a thread parameter
    const hash = `message-${result.parent_message_id || result.id}`;
    const threadParam = result.context_type === 'thread' ? '?thread=true' : '';
    router.push(`${path}${threadParam}#${hash}`);
  }, [onClose, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Search Messages
              </h3>
              <button
                onClick={() => {
                  setShouldPersist(false);
                  onClose();
                }}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <SearchBar 
                onSearch={handleSearch}
                initialValue={searchTerm}
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {error ? (
              <div className="p-4 text-red-500 text-center">
                {error.message}
              </div>
            ) : (
              <SearchResults
                results={results}
                isLoading={isLoading}
                onResultClick={handleResultClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 