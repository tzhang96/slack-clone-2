import { useState } from 'react';

interface SearchResult {
  score: number;
  content: string;
  created_at: string;
  user_id: string;
}

export default function MessageSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error('Search error:', error);
      alert('Error performing search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="p-4 border rounded">
              <div className="font-medium">{result.content}</div>
              <div className="text-sm text-gray-500 mt-2">
                Score: {(result.score * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-400">
                Created: {new Date(result.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 