import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export const SearchBar = ({ onSearch, placeholder = 'Search messages...', initialValue = '' }: SearchBarProps) => {
  const [query, setQuery] = useState(initialValue);
  
  const debouncedSearch = useDebounce((value: string) => {
    if (value.trim()) {
      onSearch(value.trim());
    }
  }, 300);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg 
                 border border-transparent focus:border-blue-500 focus:bg-white 
                 dark:focus:bg-gray-700 transition-colors duration-200
                 placeholder-gray-500 dark:placeholder-gray-400"
        aria-label="Search messages"
      />
    </div>
  );
}; 