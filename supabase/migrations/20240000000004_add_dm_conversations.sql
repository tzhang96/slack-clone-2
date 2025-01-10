-- Functions to get ordered user IDs
create or replace function get_first_user_id(user1 uuid, user2 uuid)
returns uuid as $$
begin
  if user1 < user2 then
    return user1;
  else
    return user2;
  end if;
end;
$$ language plpgsql immutable;

create or replace function get_second_user_id(user1 uuid, user2 uuid)
returns uuid as $$
begin
  if user1 < user2 then
    return user2;
  else
    return user1;
  end if;
end;
$$ language plpgsql immutable;

-- Create DM conversations table
create table dm_conversations (
  id uuid primary key default uuid_generate_v4(),
  user1_id uuid references users(id) on delete cascade,
  user2_id uuid references users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  -- Ensure user1_id and user2_id are different
  constraint different_users check (user1_id != user2_id)
);

-- Add unique index for conversation pairs
create unique index unique_conversation_pairs on dm_conversations 
  (get_first_user_id(user1_id, user2_id), get_second_user_id(user1_id, user2_id));

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