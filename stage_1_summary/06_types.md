# Types

## Chat Types
**File:** `src/types/chat.ts`

Core type definitions for chat functionality.

```typescript
interface Message {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    fullName: string
  }
  channelId: string
}

interface MessageRowData {
  messages: Message[]
  currentUserId: string
  setSize: (index: number, size: number) => void
}

interface Channel {
  id: string
  name: string
  description?: string
  createdAt: string
}
```

## Supabase Types
**File:** `src/types/supabase.ts`

Type definitions for Supabase database schema.

```typescript
interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
      }
      channels: {
        Row: ChannelRow
        Insert: ChannelInsert
        Update: ChannelUpdate
      }
      messages: {
        Row: MessageRow
        Insert: MessageInsert
        Update: MessageUpdate
      }
    }
  }
}

interface UserRow {
  id: string
  email: string
  username: string
  full_name: string
  created_at: string
}

interface ChannelRow {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface MessageRow {
  id: string
  channel_id: string
  user_id: string
  content: string
  created_at: string
}
```

## Component Types
**File:** `src/types/components.ts`

Common type definitions used across components.

```typescript
interface BaseProps {
  className?: string
  children?: React.ReactNode
}

interface LoadingProps extends BaseProps {
  isLoading: boolean
  loadingText?: string
}

interface ErrorProps extends BaseProps {
  error: Error | null
  onRetry?: () => void
}

interface PaginationProps {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
}
``` 