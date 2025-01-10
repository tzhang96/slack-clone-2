# Direct Messages Implementation Steps

## Overview
This document outlines the step-by-step process for implementing direct messages (DMs) in our Slack clone. The steps are organized to support incremental development and testing at each stage. This implementation focuses on 2-person DMs only.

## Phase 1: Type Definitions

### Step 1: Define Core Types
Create `src/types/dm.ts`:
```typescript
export interface DMConversation {
  id: string;
  created_at: string;
  updated_at: string;
  user1_id: string;  // First participant
  user2_id: string;  // Second participant
  user1?: User;      // Joined user data
  user2?: User;      // Joined user data
  last_message?: DMMessage;  // Most recent message
}

export interface DMMessage extends BaseMessage {
  conversation_id: string;
}
```

### Step 2: Update Supabase Types
Update `src/types/supabase.ts` to include new tables in the Database interface.

## Phase 2: Database Setup - Conversations

### Step 1: Create Base Tables
Create new migration file `20240000000004_add_dm_conversations.sql`:
```sql
-- Create DM conversations table
create table dm_conversations (
  id uuid primary key default uuid_generate_v4(),
  user1_id uuid references users(id) on delete cascade,
  user2_id uuid references users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  -- Ensure user1_id and user2_id are different
  constraint different_users check (user1_id != user2_id),
  -- Ensure unique conversations between pairs of users
  constraint unique_conversation unique (
    least(user1_id, user2_id),
    greatest(user1_id, user2_id)
  )
);

-- Add indexes
create index dm_conversations_users_idx on dm_conversations (
  least(user1_id, user2_id),
  greatest(user1_id, user2_id)
);

-- Add RLS policies
alter table dm_conversations enable row level security;

-- DM Conversations policies
create policy "Users can view their conversations" on dm_conversations
  for select using (
    auth.uid() = user1_id or auth.uid() = user2_id
  );

create policy "Users can create conversations" on dm_conversations
  for insert with check (
    auth.uid() = user1_id or auth.uid() = user2_id
  );
```

## Phase 3: UI Integration

### Step 1: Extend Existing Components
1. Update `MessageList` and `MessageInput` to handle DM context:
```typescript
// src/components/chat/MessageList.tsx
interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  context: 'channel' | 'dm';  // Add context type
}

// src/components/chat/MessageInput.tsx
interface MessageInputProps {
  onSend: (content: string) => void;
  context?: 'channel' | 'dm';
  disabled?: boolean;
}
```

2. Extend user tooltip to include DM action:
```typescript
// src/components/shared/UserTooltip.tsx
interface UserTooltipProps {
  user: User;
  children: React.ReactNode;
}

const UserTooltip = ({ user, children }: UserTooltipProps) => {
  const { startConversation } = useDMConversations();
  const router = useRouter();

  const handleStartDM = async () => {
    const conversationId = await startConversation(user.id);
    router.push(`/dm/${conversationId}`);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <UserAvatar user={user} />
              <div>
                <p className="font-medium">{user.full_name}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleStartDM}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

### Step 2: Update Sidebar
1. Modify `Sidebar` to include DMs section:
```typescript
// src/components/sidebar/Sidebar.tsx
const Sidebar = () => {
  const { conversations } = useDMConversations();
  const { user: currentUser } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Existing Channels section */}
      <ChannelList />

      {/* DMs section */}
      <div className="mt-6">
        <h2 className="px-3 mb-2 text-sm font-semibold text-muted-foreground">
          Direct Messages
        </h2>
        <ChannelList 
          type="dm"
          items={conversations}
          itemRenderer={(conv) => {
            const otherUser = currentUser.id === conv.user1_id 
              ? conv.user2 
              : conv.user1;
            
            return (
              <ChannelItem
                key={conv.id}
                href={`/dm/${conv.id}`}
                name={otherUser.full_name}
                icon={<UserAvatar user={otherUser} size="sm" />}
                description={conv.last_message?.content}
              />
            );
          }}
        />
      </div>
    </div>
  );
};
```

### Step 3: Update Routes and Pages
1. Create DM chat page reusing channel components:
```typescript
// src/app/dm/[conversationId]/page.tsx
export default function DMPage({ params }: { params: { conversationId: string } }) {
  return (
    <div className="flex flex-col h-full">
      <DMHeader conversationId={params.conversationId} />
      <MessageList 
        context="dm"
        messages={messages} 
        isLoading={isLoading} 
      />
      <MessageInput 
        context="dm"
        onSend={(content) => sendMessage(params.conversationId, content)} 
      />
    </div>
  );
}
```

2. Create DM header component:
```typescript
// src/components/dm/DMHeader.tsx
const DMHeader = ({ conversationId }: { conversationId: string }) => {
  const { conversation } = useDMConversation(conversationId);
  const { user: currentUser } = useAuth();
  const otherUser = currentUser.id === conversation?.user1_id 
    ? conversation?.user2 
    : conversation?.user1;

  return (
    <header className="border-b p-4">
      <div className="flex items-center gap-2">
        <UserAvatar user={otherUser} />
        <div>
          <h1 className="font-semibold">{otherUser?.full_name}</h1>
          <p className="text-sm text-muted-foreground">@{otherUser?.username}</p>
        </div>
      </div>
    </header>
  );
};
```

### Testing Steps
1. Verify tooltip DM action:
   - Hover over a username
   - Click "Message" button
   - Should create conversation or navigate to existing one

2. Test DM list in sidebar:
   - Should show all DM conversations
   - Should show correct user names
   - Should show message previews
   - Should update in real-time

3. Test DM chat:
   - Should load messages correctly
   - Should show correct user info in header
   - Should handle sending/receiving messages
   - Should maintain proper scroll position

## Phase 4: Initial Hooks and Utils

### Step 1: Create Base Hooks
Create `src/hooks/useDMConversations.ts`:
```typescript
export function useDMConversations() {
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<DMConversation[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      const { data } = await supabase
        .from('dm_conversations')
        .select(`
          *,
          user1:user1_id (*),
          user2:user2_id (*),
          last_message:dm_messages (
            id,
            content,
            created_at,
            user_id
          ).order(created_at.desc).limit(1)
        `)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false });

      if (data) setConversations(data);
    };

    fetchConversations();
  }, [currentUser]);

  return { conversations };
}
```

### Step 2: Create DM Utils
Create basic `src/lib/dm.ts`:
```typescript
export async function getDMConversation(otherUserId: string): Promise<DMConversation | null> {
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) return null;

  // Query with ordered user IDs to match our unique constraint
  const [user1_id, user2_id] = [currentUser.data.user.id, otherUserId].sort();
  
  const { data } = await supabase
    .from('dm_conversations')
    .select()
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .single();

  return data;
}

export async function startDMConversation(otherUserId: string): Promise<string> {
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) throw new Error('Not authenticated');

  // Create conversation with ordered user IDs
  const [user1_id, user2_id] = [currentUser.data.user.id, otherUserId].sort();
  
  const { data: conv, error } = await supabase
    .from('dm_conversations')
    .insert({
      user1_id,
      user2_id
    })
    .select()
    .single();

  if (error) throw error;
  if (!conv) throw new Error('Failed to create conversation');

  return conv.id;
}
```

## Phase 5: Database Setup - Messages

### Step 1: Add Messages Table
Create new migration file `20240000000005_add_dm_messages.sql`:
```sql
-- Create DM messages table
create table dm_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references dm_conversations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  content text not null check (char_length(content) <= 4000),
  created_at timestamp with time zone default now(),
  constraint valid_content check (content !~ '^\s*$')
);

-- Add indexes
create index dm_messages_conversation_id_created_at_idx 
  on dm_messages(conversation_id, created_at desc);

-- Add RLS policies
alter table dm_messages enable row level security;

-- Users can view messages in their conversations
create policy "Users can view messages in their conversations" on dm_messages
  for select using (
    exists (
      select 1 from dm_conversations
      where id = dm_messages.conversation_id
      and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

-- Users can insert messages in their conversations
create policy "Users can insert messages in their conversations" on dm_messages
  for insert with check (
    exists (
      select 1 from dm_conversations
      where id = conversation_id
      and (user1_id = auth.uid() or user2_id = auth.uid())
    )
  );

-- Function to update conversation's updated_at timestamp
create or replace function update_dm_conversation_timestamp()
returns trigger as $$
begin
  update dm_conversations
  set updated_at = now()
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to update conversation timestamp on new message
create trigger update_dm_conversation_timestamp
  after insert on dm_messages
  for each row
  execute function update_dm_conversation_timestamp();
```

## Phase 6: Messaging Components

### Step 1: Create Message Components
1. Create `DMMessageList.tsx`:
```typescript
// src/components/dm/DMChat/DMMessageList.tsx
const DMMessageList = ({ conversationId }: { conversationId: string }) => {
  const { messages, isLoading } = useDMMessages(conversationId);
  
  // Reuse existing MessageList component
  return (
    <MessageList
      messages={messages}
      isLoading={isLoading}
      context="dm"
    />
  );
};
```

2. Create `DMMessageInput.tsx`:
```typescript
// src/components/dm/DMChat/DMMessageInput.tsx
const DMMessageInput = ({ conversationId }: { conversationId: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (content: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          content
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return <MessageInput onSend={sendMessage} disabled={isLoading} />;
};
```

### Step 2: Add Message Hooks
Create `src/hooks/useDMMessages.ts`:
```typescript
export function useDMMessages(conversationId: string) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('dm_messages')
        .select(`
          *,
          user:user_id (*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setMessages(data.reverse());
      setIsLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`dm_messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as DMMessage]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  return { messages, isLoading };
}
```

## Phase 7: Polish UI

### Step 1: Enhance DM List
1. Add timestamp display
2. Add unread message indicators
3. Add proper avatar/status display

### Step 2: Enhance Chat View
1. Add proper header showing other user's info
2. Add loading states
3. Add error handling

## Phase 8: Real-time Features

### Step 1: Add Basic Subscriptions
1. Subscribe to conversation updates (for last_message)
2. Subscribe to new messages
3. Handle connection state

### Step 2: Add Advanced Features
1. Add typing indicators
2. Add online presence
3. Add read receipts

## Testing Checkpoints

After each phase, test the following:

### Phase 2-4 (Conversation Creation):
- Create new DM conversation
- Verify unique constraint works (can't create duplicate conversations)
- Check conversation appears in list
- Verify RLS policies work

### Phase 5-6 (Messaging):
- Send messages in conversation
- Verify real-time updates
- Check message persistence
- Verify conversation updated_at is updated
- Verify RLS policies for messages

### Phase 7-8 (Polish):
- Verify UI enhancements
- Test real-time features
- Check error states
- Verify performance

## Deployment Steps

1. Deploy database changes in order:
   - First conversations migration
   - Then messages migration
2. Deploy code changes
3. Verify RLS policies in production
4. Monitor for errors

## Future Enhancements

- Message search in DMs
- Rich text formatting
- File sharing in DMs
- Message reactions in DMs
- Group DM support (would require schema changes) 