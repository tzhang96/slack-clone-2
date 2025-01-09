# Components

## Chat Components

### MessageList
**File:** `src/components/chat/MessageList.tsx`

A virtualized list component that efficiently renders chat messages using windowing techniques. It handles infinite scrolling for message history and automatically manages scroll position for new messages. The component optimizes performance by only rendering messages that are currently visible in the viewport.

**Props:**
```typescript
interface MessageListProps {
  messages: Message[]        // Array of messages to display in the list, ordered by creation time
  isLoading: boolean        // Indicates if the initial messages are being loaded
  isLoadingMore: boolean    // Indicates if more messages are being loaded during pagination
  hasMore: boolean         // Indicates if there are more messages available to load
  onLoadMore: () => void   // Callback function triggered when user scrolls near the top
}
```

**Key Features:**
- Uses `react-window` for virtualized rendering
- Dynamic height calculations for messages
- Loading states and infinite scroll
- Memoized message rows for performance

### MessageInput
**File:** `src/components/chat/MessageInput.tsx`

A dynamic textarea component that expands to fit its content while maintaining a maximum height. It handles message composition with support for multiline input and provides real-time character count validation.

**Props:**
```typescript
interface MessageInputProps {
  onSend: (content: string) => void  // Callback function invoked when a message is sent
  disabled?: boolean                 // Disables the input when true
}
```

**Features:**
- Auto-expanding textarea with maximum height limit
- Character limit enforcement (4000 Unicode characters)
- Enter to send, Shift+Enter for new line
- Height management with smooth transitions

### ChannelList
**File:** `src/components/chat/ChannelList.tsx`

A comprehensive channel management component that displays and handles all channel-related operations. It provides real-time updates of channel status and supports channel creation, deletion, and selection.

**Internal State:**
```typescript
interface ChannelListState {
  isModalOpen: boolean          // Controls the visibility of the channel creation modal
  channelName: string          // Stores the name input for new channels
  description: string         // Stores the description input for new channels
  hoveredChannel: string | null  // Tracks which channel is being hovered
  deleteConfirmation: string    // Stores delete confirmation text
  createError: string | null    // Stores channel creation error messages
  deleteError: string | null    // Stores channel deletion error messages
}
```

## Authentication Components

### LoginForm
**File:** `src/components/auth/LoginForm.tsx`

A secure authentication form that handles user login with comprehensive error handling. It implements client-side validation using react-hook-form and provides clear feedback for all error states.

### SignupForm
**File:** `src/components/auth/SignupForm.tsx`

A robust registration form that guides users through account creation with real-time validation. It implements password strength requirements and username availability checking.

## Shared Components

### Button
**File:** `src/components/shared/Button.tsx`

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
const variants = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  danger: 'bg-red-500 hover:bg-red-600 text-white'
}

const sizes = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
}
```

### Input
**File:** `src/components/shared/Input.tsx`

A foundational input component that provides consistent styling and behavior for form fields.

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string              // Optional label text displayed above the input
  error?: string             // Error message to display below the input
  fullWidth?: boolean        // Makes input fill container width
  icon?: React.ReactNode     // Optional icon to display inside the input
  iconPosition?: 'left' | 'right'  // Position of the icon
}
```

## Layout Components

### AuthLayout
**File:** `src/components/layout/AuthLayout.tsx`

A consistent layout wrapper for authentication-related pages that provides proper styling and structure.

**Props:**
```typescript
interface AuthLayoutProps {
  children: React.ReactNode     // Content to be rendered within the layout
  title?: string               // Optional page title
  description?: string         // Optional page description
}
```

### ChatLayout
**File:** `src/components/layout/ChatLayout.tsx`

The main application layout that manages the arrangement of chat interface elements.

**Props:**
```typescript
interface ChatLayoutProps {
  children: React.ReactNode     // Main content area
  sidebar: React.ReactNode      // Sidebar content (typically ChannelList)
  header?: React.ReactNode      // Optional custom header content
}
```

### Header
**File:** `src/components/layout/Header.tsx`

A persistent navigation component that provides user context and primary actions.

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
``` 