# Development Guidelines

## Code Style

### Early Returns
- Use early returns to reduce nesting and improve code readability
- Handle error cases first
- Exit functions as soon as possible

Example:
```typescript
function processMessage(message: string | null) {
  if (!message) return null
  if (message.length > MAX_LENGTH) return null
  
  // Process valid message
  return processValidMessage(message)
}
```

### Styling
- Use Tailwind classes exclusively for styling
- Follow utility-first CSS principles
- Use consistent spacing and layout classes

Example:
```typescript
const Button = ({ children }: ButtonProps) => (
  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md">
    {children}
  </button>
)
```

## Best Practices

### List Virtualization
- Implement react-window for large lists
- Use dynamic sizing for variable content
- Maintain smooth scrolling performance

Example:
```typescript
import { VariableSizeList } from 'react-window'

const MessageList = ({ messages }: MessageListProps) => (
  <VariableSizeList
    height={400}
    itemCount={messages.length}
    itemSize={getMessageHeight}
    width="100%"
  >
    {MessageRow}
  </VariableSizeList>
)
```

### Naming Conventions
- Use descriptive, action-based names for event handlers (e.g., handleMessageSubmit)
- Use clear, semantic names for components
- Follow TypeScript naming conventions for interfaces and types

Example:
```typescript
// Good
const handleMessageSubmit = (content: string) => {}
interface MessageInputProps {}
type MessageStatus = 'sending' | 'sent' | 'error'

// Bad
const submit = (msg: string) => {}
interface Props {}
type Status = 'a' | 'b' | 'c'
```

### Accessibility
- Implement proper ARIA labels
- Ensure keyboard navigation
- Maintain proper heading hierarchy

Example:
```typescript
const MessageInput = () => (
  <textarea
    aria-label="Message input"
    role="textbox"
    tabIndex={0}
    onKeyDown={handleKeyDown}
  />
)
```

## TypeScript Guidelines

### Function Declarations
- Use const arrow functions for component definitions
- Implement proper type annotations
- Keep functions focused and single-purpose

Example:
```typescript
const MessageComponent: React.FC<MessageProps> = ({ content, user }) => {
  return <div>{content}</div>
}
```

### Type Safety
- Use strict type checking
- Implement proper interface segregation
- Avoid any type when possible
- Use generics for reusable components

Example:
```typescript
interface ListProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
}

const List = <T extends { id: string }>({ items, renderItem }: ListProps<T>) => (
  <div>
    {items.map(item => renderItem(item))}
  </div>
)
``` 