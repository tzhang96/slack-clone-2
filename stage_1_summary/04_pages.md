# Pages

## Root Page
**File:** `src/app/page.tsx`

The application's entry point that handles initial routing and authentication state. It implements proper redirection logic based on user authentication status and provides a smooth initial loading experience.

## Chat Pages

### Channel Page
**File:** `src/app/chat/[channelId]/page.tsx`

The main chat interface that displays messages and handles real-time updates for a specific channel. It implements proper error boundaries and loading states for a smooth user experience.

**Features:**
- Message list display with `useMessages` hook
- Real-time message updates
- Error boundary integration
- Loading state management

### Chat Home Page
**File:** `src/app/chat/page.tsx`

A welcome page that displays when no specific channel is selected. It provides navigation guidance and channel selection options.

## Authentication Pages

### Login Page
**File:** `src/app/login/page.tsx`

Page component for user login that integrates the LoginForm component.

**Features:**
- LoginForm integration
- AuthLayout wrapper
- Redirect handling for authenticated users
- Error message display

### Signup Page
**File:** `src/app/signup/page.tsx`

Page component for user registration that integrates the SignupForm component.

**Features:**
- SignupForm integration
- AuthLayout wrapper
- Redirect handling for authenticated users
- Success message display

## Test Page
**File:** `src/app/test/page.tsx`

A development environment page that provides isolated testing capabilities for components. It includes example implementations and test scenarios for various features. 