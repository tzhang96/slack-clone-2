# User Status Implementation Steps

## Overview
This document outlines the step-by-step process for implementing user presence and status features in the Slack clone application, focusing on core functionality.

## Steps

### 1. Database Updates
The foundation of user presence tracking requires storing both explicit status choices and activity timestamps. The `status` column stores the user's current status, while `last_seen` is reserved for future enhancements.

Add necessary columns to the users table:
```sql
ALTER TABLE users
ADD COLUMN status text DEFAULT 'offline',
ADD COLUMN last_seen timestamp with time zone DEFAULT NOW();
```

### 2. Create Presence Types
Type definitions ensure type safety and provide autocompletion throughout the application. We start with three basic status types to keep the implementation simple.

Create type definitions in `src/types/presence.ts`:
```typescript
type UserStatus = 'online' | 'offline' | 'away';

interface UserPresence {
  status: UserStatus;
}
```

### 3. Create Presence Hook
A custom hook encapsulates all presence-related logic in one place, making it reusable across components. This hook handles basic status updates based on window focus.

Implement `src/hooks/usePresence.ts` for managing user presence:
```typescript
const usePresence = () => {
  const updateStatus = async (status: UserStatus) => {...}
  return { updateStatus };
}
```

### 4. Set Up Real-time Subscriptions
Real-time subscriptions enable instant status updates across all connected clients. This creates a live presence system where users can see each other's status changes immediately.

- Create Supabase real-time channel for presence
- Subscribe to user status changes
- Handle connection/disconnection events

### 5. Implement Activity Tracking
Simple activity tracking based on window focus provides basic presence information without complex event handling.

- Handle window focus/blur events
- Update status on connection/disconnection

### 6. Create Presence Provider Component
The Presence Provider serves as a central manager for presence state and logic.

- Wrap app with presence context
- Handle initial presence setup
- Manage cleanup on unmount

### 7. Add UI Components
These UI components provide visual feedback about user presence with minimal complexity.

Create new components for:
- Status indicator (colored dot)
- Status selector dropdown

### 8. Update Existing Components
Integrating presence indicators into existing components enhances the user experience.

Add status indicators to:
- User avatars in messages
- Channel member list

### 9. Implement Presence Logic
Simple window focus tracking provides basic presence detection.

Add event listeners for tracking presence:
```typescript
// Track window focus
window.addEventListener('focus', () => updateStatus('online'));
window.addEventListener('blur', () => updateStatus('away'));
```

### 10. Add Cleanup Logic
Basic cleanup ensures the presence system works reliably.

Implement cleanup for:
- Page unload handling (set status to offline)
- Event listener cleanup

### 11. Optimize Performance
Basic optimizations to ensure smooth operation.

Add optimizations:
- Debounce status updates
- Cache presence data

### 12. Add Error Handling
Simple error handling for core functionality.

Implement error handling for:
- Connection drops
- Failed status updates

## Implementation Order
1. Start with database changes (Step 1)
2. Implement types and basic hook (Steps 2-3)
3. Add real-time functionality (Step 4)
4. Build UI components (Steps 7-8)
5. Add presence logic and tracking (Steps 5-6, 9)
6. Implement cleanup and error handling (Steps 10, 12)
7. Add basic optimizations (Step 11)

## Notes
- Focus on core functionality first
- Keep the UI simple and intuitive
- Test basic presence scenarios thoroughly 