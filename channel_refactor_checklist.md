# Channel Refactoring Checklist

## 1. Data Layer Cleanup
- [x] Create `lib/repositories/channelRepository.ts`
  - Move DB operations from useChannels hook
  - Follow existing MessageRepository pattern
  - Add proper error handling
- [x] Update `useChannels` hook to use repository
  - Remove direct Supabase calls
  - Keep real-time subscription logic for now

## 2. ChannelList Component Cleanup
- [x] Split modals into separate components
  - Move create channel modal to `components/chat/CreateChannelModal.tsx`
  - Move delete channel modal to `components/chat/DeleteChannelModal.tsx`
- [x] Extract validation logic to `lib/utils/channelValidation.ts`
- [x] Clean up ChannelList.tsx
  - Remove modal code
  - Remove validation logic
  - Add error boundary
  - Add proper loading states

## 3. Channel Page Improvements
- [x] Add error boundaries for message loading
  - Create MessageListWithError component
  - Add error boundary to channel page
  - Add error boundary to thread sidebar
- [x] Add proper loading states
  - Create reusable LoadingSpinner/LoadingState components
  - Create ChannelListSkeleton for better UX
  - Create ChannelPageSkeleton for better UX
  - Replace simple spinners with skeletons
- [ ] Extract complex scroll logic to a custom hook
- [x] Clean up debug logging

## 4. Error Handling
- [x] Create consistent error types for channels
  - Add error boundaries for key components
  - Add fallback UI for errors
- [ ] Add proper error states in UI components
- [ ] Improve error messages for users

## Future Improvements (Not Critical)
- Move channel types to dedicated file
- Extract thread management logic
- Add channel membership tracking
- Improve real-time update handling

## Notes
- Keep changes aligned with existing patterns
- Focus on maintainability and reliability
- Document complex logic
- Remove unnecessary console.logs 