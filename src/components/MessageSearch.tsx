'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchResult {
  score: number;
  content: string;
  created_at: string;
  user_id: string;
}

interface ChatResponse {
  answer: string;
  context: {
    content: string;
    score: number;
  }[];
}

export default function MessageSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'chat'>('search');

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      setChatResponse(null);
      
      if (mode === 'search') {
        const response = await fetch('/api/search-messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            topK: 5
          }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setResults(data.results);
      } else {
        const response = await fetch('/api/chat-with-context', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setChatResponse(data);
        setResults([]);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error performing operation');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => {
              setMode('search');
              setChatResponse(null);
              setResults([]);
            }}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              mode === 'search' 
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            )}
          >
            Search Mode
          </button>
          <button
            onClick={() => {
              setMode('chat');
              setChatResponse(null);
              setResults([]);
            }}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              mode === 'chat' 
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            )}
          >
            Chat Mode
          </button>
        </div>

        <label htmlFor="search-input" className="text-sm font-medium text-gray-700">
          {mode === 'search' ? 'Search Messages' : 'Ask About Messages'}
        </label>
        <div className="flex gap-2">
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'search' ? "Type your search query..." : "Ask a question about the messages..."}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            aria-label={mode === 'search' ? "Search messages" : "Ask question"}
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              loading || !query.trim() 
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
            aria-label={loading ? "Processing..." : mode === 'search' ? "Search" : "Ask"}
          >
            {loading ? "Processing..." : mode === 'search' ? "Search" : "Ask"}
          </button>
        </div>
      </div>

      {/* Chat Response */}
      {chatResponse && (
        <div className="space-y-6">
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-lg text-blue-900 mb-3">Answer:</h3>
            <p className="text-gray-900 whitespace-pre-wrap">{chatResponse.answer}</p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-lg text-gray-900">Related Messages:</h3>
            {chatResponse.context.map((item, index) => (
              <div 
                key={index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-gray-800">{item.content}</p>
                <p className="mt-2 text-sm text-gray-500">
                  Relevance: {(item.score * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4" role="list" aria-label="Search results">
          {results.map((result, index) => (
            <div 
              key={index}
              className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors"
              role="listitem"
            >
              <div className="font-medium text-gray-900">{result.content}</div>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Relevance:</span>
                  <span>{(result.score * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Created:</span>
                  <time dateTime={result.created_at}>
                    {new Date(result.created_at).toLocaleString()}
                  </time>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {query && !loading && results.length === 0 && !chatResponse && (
        <div className="text-center py-8 text-gray-500">
          No results found.
        </div>
      )}
    </div>
  );
} 