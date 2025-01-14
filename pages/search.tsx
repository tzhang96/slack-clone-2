import MessageSearch from '../components/MessageSearch';

export default function SearchPage() {
  return (
    <div className="container mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold my-4">Search Messages</h1>
      <MessageSearch />
    </div>
  );
} 