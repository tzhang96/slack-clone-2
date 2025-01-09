# Utilities

## Authentication Service
**File:** `src/lib/auth.tsx`

Provides authentication functionality using Supabase.

**Components:**
- `AuthProvider`: Context provider that manages authentication state and user sessions
- `useAuth`: Hook that provides access to authentication methods and user state

**Functions:**
- `signIn`: Handles user sign-in with email and password
- `signUp`: Manages user registration process
- `signOut`: Handles user sign-out and session cleanup
- `getSession`: Retrieves the current user session

## Supabase Client
**File:** `src/lib/supabase.ts`

Initializes and exports the Supabase client for database operations.

**Exports:**
- `supabase`: Configured Supabase client instance
- `SUPABASE_URL`: Environment variable for Supabase project URL
- `SUPABASE_ANON_KEY`: Public anon key for Supabase client

## Initial Data
**File:** `src/lib/init-data.ts`

Manages initial data and default values for the application.

**Exports:**
- `defaultChannels`: Array of default channels created on initialization
- `Channel`: Type definition for channel structure
- `initializeData`: Function to set up initial database state

## Middleware
**File:** `src/middleware.ts`

Handles route protection and authentication verification.

**Features:**
- Protects routes requiring authentication
- Redirects unauthenticated users to login
- Manages authentication tokens and headers
- Handles public routes whitelist

**Configuration:**
```typescript
interface MiddlewareConfig {
  // Routes that don't require authentication
  publicRoutes: string[]

  // Routes that require authentication
  protectedRoutes: string[]

  // Routes that should redirect to dashboard if authenticated
  authRoutes: string[]
}
``` 