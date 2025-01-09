# Emoji Reactions Implementation Steps

## Overview
This document outlines the step-by-step implementation of emoji reactions in the chat application, covering database changes, backend logic, and frontend components.

## User Stories Covered
1. **Adding Reactions**
   - Users can click to add reactions to messages
   - Users can select emojis from a picker
   - Reactions appear immediately
   - No duplicate emoji reactions from the same user

2. **Viewing Reactions**
   - Users can see all emoji reactions on messages
   - Users can see reaction counts
   - Users can see who reacted on hover
   - Real-time updates of reactions

3. **Managing Reactions**
   - Users can remove their own reactions
   - Users cannot remove others' reactions
   - Users can add different emoji reactions to the same message

## Implementation Steps

### 1. Database Schema Changes
- Create new `reactions` table with:
  - `id` (UUID, primary key)
  - `message_id` (UUID, foreign key to messages)
  - `user_id` (UUID, foreign key to users)
  - `emoji` (text, the emoji character/code)
  - `created_at` (timestamp)
- Add constraints:
  - Unique constraint on (message_id, user_id, emoji)
  - Foreign key constraints with cascade delete
- Create indexes:
  - Index on message_id for quick reaction lookups
  - Index on user_id for user's reactions
- Implement RLS policies:
  - Allow users to view all reactions
  - Allow users to add/remove only their own reactions

### 2. Backend API Layer
- Create Supabase functions/endpoints:
  ```typescript
  addReaction(messageId: string, emoji: string)
  removeReaction(messageId: string, emoji: string)
  getMessageReactions(messageId: string)
  ```
- Set up real-time subscriptions
- Implement error handling:
  - Duplicate reactions
  - Invalid message IDs
  - Permission errors

### 3. Frontend Types & State Management
- Add new TypeScript interfaces:
  ```typescript
  interface Reaction {
    id: string
    messageId: string
    userId: string
    emoji: string
    createdAt: string
  }

  interface MessageWithReactions extends Message {
    reactions: Reaction[]
  }
  ```
- Create custom hooks:
  - `useReactions(messageId: string)`
  - `useReactionMutations()`
- Update existing message components to handle reactions

### 4. UI Components
- Create new components:
  - `MessageReactions.tsx`: Display reactions on messages
  - `EmojiPicker.tsx`: Emoji selection interface
  - `ReactionCounter.tsx`: Show reaction counts
  - `ReactionTooltip.tsx`: Show users who reacted
- Update existing components:
  - Add reaction button to message component
  - Integrate reaction display into message layout
  - Add hover states and tooltips

### 5. Real-time Implementation
- Set up Supabase subscriptions:
  ```typescript
  supabase
    .channel('reactions')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'reactions'
    })
  ```
- Implement optimistic updates
- Handle edge cases:
  - Race conditions
  - Failed reactions
  - Network errors
  - Subscription reconnection

## Testing Considerations
- Unit tests for reaction hooks and components
- Integration tests for reaction flow
- Real-time subscription tests
- Edge case testing for concurrent reactions

## Performance Considerations
- Batch reaction fetching
- Optimistic UI updates
- Efficient real-time subscription handling
- Proper indexing for quick lookups 