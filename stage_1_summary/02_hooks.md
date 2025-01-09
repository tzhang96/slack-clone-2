# Hooks

## useChannels
**File:** `src/hooks/useChannels.ts`

A powerful hook that manages all channel-related state and operations with real-time synchronization. It handles channel CRUD operations, maintains channel list state, and provides optimistic updates for a smooth user experience.

```typescript
interface UseChannelsReturn {
  // Array of all available channels, sorted by creation date
  channels: Channel[]

  // Indicates if the initial channel fetch is in progress
  isLoading: boolean

  // Stores any error that occurs during channel operations
  error: Error | null

  // Finds and returns a channel by its name
  getChannelByName: (name: string) => Channel | undefined

  // Forces a refresh of the channel list from the server
  refreshChannels: () => Promise<void>

  // Creates a new channel with the given name and optional description
  createChannel: (name: string, description?: string) => Promise<Channel>

  // Permanently removes a channel by its ID
  deleteChannel: (channelId: string) => Promise<void>
}
```

## useMessages
**File:** `src/hooks/useMessages.ts`

A sophisticated hook that manages message state, pagination, and real-time updates for a channel. It implements efficient message caching, handles optimistic updates for sent messages, and manages scroll position preservation during updates.

```typescript
interface UseMessagesReturn {
  // Array of messages in the current channel, ordered by timestamp
  messages: Message[]

  // Indicates if the initial message fetch is in progress
  isLoading: boolean

  // Indicates if more messages are being fetched during pagination
  isLoadingMore: boolean

  // Stores any error that occurs during message operations
  error: Error | null

  // Indicates if there are more messages available to load
  hasMore: boolean

  // Sends a new message to the current channel
  sendMessage: (content: string) => Promise<void>

  // Loads older messages for pagination
  loadMoreMessages: () => Promise<void>

  // Refreshes the current message list from the server
  fetchMessages: () => Promise<void>

  // Indicates if the message view is scrolled to the bottom
  isAtBottom: boolean

  // Checks if the current scroll position is at the bottom
  checkIsAtBottom: () => boolean

  // Smoothly scrolls the message view to the bottom
  scrollToBottom: () => void

  // Handles real-time message updates
  handleMessagesChange: () => void
}
```

## useAuth
**File:** `src/lib/auth.tsx`

Authentication hook that provides user authentication state and methods. It handles all authentication-related operations and maintains the current user session.

```typescript
interface UseAuthReturn {
  // Current user session data
  session: Session | null

  // Current user profile data
  user: User | null

  // Indicates if initial authentication check is in progress
  isLoading: boolean

  // Sign in with email and password
  signIn: (email: string, password: string) => Promise<AuthResponse>

  // Register new user with email and password
  signUp: (email: string, password: string, userData: UserData) => Promise<AuthResponse>

  // Sign out current user
  signOut: () => Promise<void>

  // Refresh the current session
  refreshSession: () => Promise<void>

  // Update user profile data
  updateProfile: (data: Partial<UserData>) => Promise<void>
}

interface UserData {
  email: string
  username: string
  full_name: string
}

interface AuthResponse {
  success: boolean
  error?: Error
  user?: User
}
``` 