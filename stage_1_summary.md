# Slack Clone 2 - API Documentation

## Components API

### Chat Components

#### `MessageList` (`src/components/chat/MessageList.tsx`)
A virtualized list component that efficiently renders chat messages using windowing techniques. It handles infinite scrolling for message history and automatically manages scroll position for new messages. The component optimizes performance by only rendering messages that are currently visible in the viewport.

**Props:**
```typescript
interface MessageListProps {
  messages: Message[]        // Array of messages to display in the list, ordered by creation time. Messages are rendered in reverse chronological order.
  isLoading: boolean        // Indicates if the initial messages are being loaded. Used to show a loading skeleton UI.
  isLoadingMore: boolean    // Indicates if more messages are being loaded during pagination. Shows a loading indicator at the top.
  hasMore: boolean         // Indicates if there are more messages available to load. Controls whether to trigger the load more action.
  onLoadMore: () => void   // Callback function triggered when user scrolls near the top to load more messages. Should handle pagination logic.
}
```

**Internal Functions:**
- `MessageRow`: Memoized component that renders individual message items with dynamic height calculation.
- `getItemSize`: Returns the height of a message row for virtualized rendering.
- `handleScroll`: Manages scroll position and triggers loading of more messages.

**Key Features:**
- Uses `react-window` for virtualized rendering of large message lists
- Dynamic height calculations for variable message sizes
- Loading states and infinite scroll for pagination
- Memoized message rows for optimal performance
- Automatic scroll management for new messages

#### `MessageInput` (`src/components/chat/MessageInput.tsx`)
A dynamic textarea component that expands to fit its content while maintaining a maximum height. It handles message composition with support for multiline input and provides real-time character count validation. The component implements keyboard shortcuts for sending messages while maintaining a natural typing experience.

**Props:**
```typescript
interface MessageInputProps {
  onSend: (content: string) => void  // Callback function invoked when a message is sent. Receives the sanitized message content.
  disabled?: boolean                 // Disables the input when true, preventing message sending. Used during loading states or when offline.
}
```

**Internal Functions:**
- `adjustTextareaHeight`: Automatically adjusts the textarea height based on content.
- `handleSubmit`: Processes message submission and validates content.
- `handleKeyDown`: Manages keyboard events for sending messages.
- `getUnicodeLength`: Correctly counts Unicode characters for length validation.

**Features:**
- Auto-expanding textarea with maximum height limit
- Character limit enforcement (4000 Unicode characters)
- Enter to send, Shift+Enter for new line
- Height management with smooth transitions
- Disabled state handling

#### `ChannelList` (`src/components/chat/ChannelList.tsx`)
A comprehensive channel management component that displays and handles all channel-related operations. It provides real-time updates of channel status and supports channel creation, deletion, and selection. The component implements optimistic updates for a responsive user experience.

**Props:**
```typescript
interface ChannelListProps {
  // No props required as it uses ChannelContext internally
}
```

**Internal State:**
```typescript
interface ChannelListState {
  isModalOpen: boolean          // Controls the visibility of the channel creation modal
  channelName: string          // Stores the name input for new channels
  description: string         // Stores the description input for new channels
  hoveredChannel: string | null  // Tracks which channel is being hovered for UI effects
  deleteConfirmation: string    // Stores delete confirmation text
  createError: string | null    // Stores channel creation error messages
  deleteError: string | null    // Stores channel deletion error messages
}
```

**Features:**
- Channel creation with name validation
- Channel deletion with confirmation
- Active channel highlighting
- Hover states and animations
- Modal management for channel actions
- Error handling and validation feedback

## Hooks API

### `useChannels` (`src/hooks/useChannels.ts`)
A powerful hook that manages all channel-related state and operations with real-time synchronization. It handles channel CRUD operations, maintains channel list state, and provides optimistic updates for a smooth user experience. The hook includes error handling and automatic reconnection logic for real-time events.

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

### `useMessages` (`src/hooks/useMessages.ts`)
A sophisticated hook that manages message state, pagination, and real-time updates for a channel. It implements efficient message caching, handles optimistic updates for sent messages, and manages scroll position preservation during updates. The hook also includes rate limiting and error handling for message operations.

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

  // Sends a new message to the current channel. Handles optimistic updates.
  sendMessage: (content: string) => Promise<void>

  // Loads older messages for pagination. Manages scroll position.
  loadMoreMessages: () => Promise<void>

  // Refreshes the current message list from the server
  fetchMessages: () => Promise<void>

  // Indicates if the message view is scrolled to the bottom
  isAtBottom: boolean

  // Checks if the current scroll position is at the bottom
  checkIsAtBottom: () => boolean

  // Smoothly scrolls the message view to the bottom
  scrollToBottom: () => void

  // Handles real-time message updates and optimistic updates
  handleMessagesChange: () => void
}

## Database Schema

### Tables

#### `users`
The core table storing user account information with secure authentication integration. It maintains user profiles with proper validation rules and uniqueness constraints. The table is optimized for frequent reads with appropriate indexing.

**Attributes:**
- `id` (UUID, PK): Unique identifier linked to auth.users
- `email` (VARCHAR(255)): User's email address, must be unique and valid format
- `username` (VARCHAR(20)): Unique username, alphanumeric with underscores
- `full_name` (VARCHAR(50)): User's full name, 1-50 characters
- `created_at` (TIMESTAMP): Account creation timestamp

**Indexes:**
- Primary Key on `id`
- Unique index on `email`
- Unique index on `username`

#### `channels`
A central table managing chat channels with support for real-time collaboration. It enforces naming conventions and maintains referential integrity with messages. The table includes optimized indexes for channel lookup operations.

**Attributes:**
- `id` (UUID, PK): Unique identifier for the channel
- `name` (VARCHAR(50)): Unique channel name, lowercase alphanumeric with hyphens
- `description` (VARCHAR(500)): Optional channel description
- `created_at` (TIMESTAMP): Channel creation timestamp

**Indexes:**
- Primary Key on `id`
- Unique index on `name`

#### `messages`
A high-performance table storing all chat messages with proper relationships and constraints. It implements efficient pagination through timestamp-based indexing and maintains data integrity through foreign key relationships. The table is optimized for both real-time inserts and historical queries.

**Attributes:**
- `id` (UUID, PK): Unique identifier for the message
- `channel_id` (UUID, FK): Reference to channels table
- `user_id` (UUID, FK): Reference to users table
- `content` (TEXT): Message content, 1-4000 characters
- `created_at` (TIMESTAMP): Message creation timestamp

**Indexes:**
- Primary Key on `id`
- Index on `channel_id` for faster channel message queries
- Index on `created_at` for efficient message ordering and pagination

## Security

### Row Level Security (RLS) Policies

#### Users Table
- SELECT: All authenticated users can view all users
- INSERT: Users can only insert their own profile
- UPDATE: Users can only update their own profile

#### Channels Table
- SELECT: All authenticated users can view all channels
- INSERT: All authenticated users can create channels
- DELETE: All authenticated users can delete channels

#### Messages Table
- SELECT: All authenticated users can view messages
- INSERT: Users can only insert messages with their own user_id

## Development Guidelines

1. **Early Returns**
   - Use early returns to reduce nesting and improve code readability
   - Handle error cases first
   - Exit functions as soon as possible

2. **Styling**
   - Use Tailwind classes exclusively for styling
   - Follow utility-first CSS principles
   - Use consistent spacing and layout classes

3. **List Virtualization**
   - Implement react-window for large lists
   - Use dynamic sizing for variable content
   - Maintain smooth scrolling performance

4. **Naming Conventions**
   - Use descriptive, action-based names for event handlers (e.g., handleMessageSubmit)
   - Use clear, semantic names for components
   - Follow TypeScript naming conventions for interfaces and types

5. **Accessibility**
   - Implement proper ARIA labels
   - Ensure keyboard navigation
   - Maintain proper heading hierarchy

6. **Function Declarations**
   - Use const arrow functions for component definitions
   - Implement proper type annotations
   - Keep functions focused and single-purpose

7. **TypeScript Best Practices**
   - Use strict type checking
   - Implement proper interface segregation
   - Avoid any type when possible
   - Use generics for reusable components 

## Utility Functions and Services

### Authentication (`src/lib/auth.tsx`)
Provides authentication functionality using Supabase.

**Components:**
- `AuthProvider`: Context provider that manages authentication state and user sessions.
- `useAuth`: Hook that provides access to authentication methods and user state.

**Functions:**
- `signIn`: Handles user sign-in with email and password.
- `signUp`: Manages user registration process.
- `signOut`: Handles user sign-out and session cleanup.
- `getSession`: Retrieves the current user session.

### Supabase Client (`src/lib/supabase.ts`)
Initializes and exports the Supabase client for database operations.

**Exports:**
- `supabase`: Configured Supabase client instance
- `SUPABASE_URL`: Environment variable for Supabase project URL
- `SUPABASE_ANON_KEY`: Public anon key for Supabase client

### Initial Data (`src/lib/init-data.ts`)
Manages initial data and default values for the application.

**Exports:**
- `defaultChannels`: Array of default channels created on initialization
- `Channel`: Type definition for channel structure
- `initializeData`: Function to set up initial database state

## Middleware

### Authentication Middleware (`src/middleware.ts`)
Handles route protection and authentication verification.

**Features:**
- Protects routes requiring authentication
- Redirects unauthenticated users to login
- Manages authentication tokens and headers
- Handles public routes whitelist

## Type Definitions

### Chat Types (`src/types/chat.ts`)
Defines types for chat-related functionality.

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

### Supabase Types (`src/types/supabase.ts`)
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

## Authentication Components

### `LoginForm` (`src/components/auth/LoginForm.tsx`)
A secure authentication form that handles user login with comprehensive error handling. It implements client-side validation using react-hook-form and provides clear feedback for all error states. The component maintains security best practices while providing a smooth user experience.

### `SignupForm` (`src/components/auth/SignupForm.tsx`)
A robust registration form that guides users through account creation with real-time validation. It implements password strength requirements and username availability checking. The component provides clear feedback and handles all edge cases gracefully.

## Shared Components

### `Button` (`src/components/shared/Button.tsx`)
A highly reusable button component that implements consistent styling and behavior across the application.

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'  // Visual style variant
  size?: 'sm' | 'md' | 'lg'                    // Button size
  isLoading?: boolean                          // Shows loading spinner when true
  fullWidth?: boolean                          // Makes button fill container width
}
```

**Styles:**
```typescript
// Variant styles
const variants = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  danger: 'bg-red-500 hover:bg-red-600 text-white'
}

// Size styles
const sizes = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
}
```

### `Input` (`src/components/shared/Input.tsx`)
A foundational input component that provides consistent styling and behavior for form fields. It handles error states, labels, and accessibility requirements while maintaining a clean design. The component supports all HTML input attributes while providing additional functionality.

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string              // Optional label text displayed above the input
  error?: string             // Error message to display below the input
  fullWidth?: boolean        // Makes input fill container width
  icon?: React.ReactNode     // Optional icon to display inside the input
  iconPosition?: 'left' | 'right'  // Position of the icon
}

## Pages

### Root Page (`src/app/page.tsx`)
The application's entry point that handles initial routing and authentication state. It implements proper redirection logic based on user authentication status and provides a smooth initial loading experience. The page ensures users are directed to the appropriate section of the application.

### Chat Pages

#### Channel Page (`src/app/chat/[channelId]/page.tsx`)
The main chat interface that displays messages and handles real-time updates for a specific channel. It implements proper error boundaries and loading states for a smooth user experience. The page manages complex state interactions between messages, channels, and user input.

#### Chat Home Page (`src/app/chat/page.tsx`)
A welcome page that displays when no specific channel is selected. It provides navigation guidance and channel selection options. The page maintains consistency with the chat interface while providing a clear entry point for users.

### Test Page (`src/app/test/page.tsx`)
A development environment page that provides isolated testing capabilities for components. It includes example implementations and test scenarios for various features. The page is essential for development but is not included in production builds.

## Layout Components

### `AuthLayout` (`src/components/layout/AuthLayout.tsx`)
A consistent layout wrapper for authentication-related pages that provides proper styling and structure. It implements responsive design principles and maintains proper spacing for form elements. The layout ensures a professional appearance for all authentication flows.

**Props:**
```typescript
interface AuthLayoutProps {
  children: React.ReactNode     // Content to be rendered within the layout
  title?: string               // Optional page title
  description?: string         // Optional page description
}
```

### `ChatLayout` (`src/components/layout/ChatLayout.tsx`)
The main application layout that manages the arrangement of chat interface elements. It implements a responsive sidebar design and handles proper content organization. The layout provides smooth transitions between different viewport sizes.

**Props:**
```typescript
interface ChatLayoutProps {
  children: React.ReactNode     // Main content area
  sidebar: React.ReactNode      // Sidebar content (typically ChannelList)
  header?: React.ReactNode      // Optional custom header content
}
```

### `Header` (`src/components/layout/Header.tsx`)
A persistent navigation component that provides user context and primary actions. It implements proper responsive behavior and maintains user context across the application. The header provides essential navigation while remaining unobtrusive.

**Props:**
```typescript
interface HeaderProps {
  user?: User                  // Current user information
  onSignOut?: () => void      // Callback for sign out action
  showChannelInfo?: boolean   // Whether to show current channel information
}

interface User {
  id: string
  email: string
  username: string
  full_name: string
  avatar_url?: string
}

## Route Handlers

### Error Handling
A comprehensive set of components that manage error states and loading indicators throughout the application. These handlers provide graceful degradation and clear user feedback for all error scenarios. The implementation ensures users always understand the application's state.

**Components:**
```typescript
// Error boundary component for catching and displaying errors
interface ErrorBoundaryProps {
  error: Error
  reset: () => void
}

// Loading skeleton component for content loading states
interface LoadingSkeletonProps {
  rows?: number
  animate?: boolean
}
```

**Features:**
- Graceful error display with retry functionality
- Loading skeleton UI with customizable rows
- Smooth state transitions
- Error tracking and logging
- Consistent error message formatting

[End of file] 