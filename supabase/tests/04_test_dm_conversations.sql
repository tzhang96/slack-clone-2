-- Reset test data
delete from dm_conversations;

-- Create test auth users if they don't exist
insert into auth.users (id, email, email_confirmed_at, created_at, updated_at)
values 
  ('d7bed21c-5c8c-401d-9c8d-ef8e1296c6df', 'user1@test.com', now(), now(), now()),
  ('e9d85736-9c4f-4b8c-9c4f-8c7d85736b8c', 'user2@test.com', now(), now(), now())
on conflict (id) do nothing;

-- Create test public users if they don't exist
insert into public.users (id, email, username, full_name)
values 
  ('d7bed21c-5c8c-401d-9c8d-ef8e1296c6df', 'user1@test.com', 'testuser1', 'Test User 1'),
  ('e9d85736-9c4f-4b8c-9c4f-8c7d85736b8c', 'user2@test.com', 'testuser2', 'Test User 2')
on conflict (id) do nothing;

-- Test 1: Create a conversation
insert into dm_conversations (user1_id, user2_id)
values 
  ('d7bed21c-5c8c-401d-9c8d-ef8e1296c6df', 'e9d85736-9c4f-4b8c-9c4f-8c7d85736b8c')
returning *;

-- Test 2: Attempt to create duplicate conversation (should fail)
-- First, with same order
insert into dm_conversations (user1_id, user2_id)
values 
  ('d7bed21c-5c8c-401d-9c8d-ef8e1296c6df', 'e9d85736-9c4f-4b8c-9c4f-8c7d85736b8c');

-- Then, with reversed order (should also fail)
insert into dm_conversations (user1_id, user2_id)
values 
  ('e9d85736-9c4f-4b8c-9c4f-8c7d85736b8c', 'd7bed21c-5c8c-401d-9c8d-ef8e1296c6df');

-- Test 3: Attempt to create self-conversation (should fail)
insert into dm_conversations (user1_id, user2_id)
values 
  ('d7bed21c-5c8c-401d-9c8d-ef8e1296c6df', 'd7bed21c-5c8c-401d-9c8d-ef8e1296c6df');

-- Test 4: Verify ordering functions
select 
  user1_id,
  user2_id,
  get_first_user_id(user1_id, user2_id) as ordered_first,
  get_second_user_id(user1_id, user2_id) as ordered_second
from dm_conversations;

-- Test 5: Test RLS policies
-- Reset role and set first user
reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'd7bed21c-5c8c-401d-9c8d-ef8e1296c6df';

-- Should see conversations where user is either user1 or user2
select * from dm_conversations;

-- Reset role and set second user
reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'e9d85736-9c4f-4b8c-9c4f-8c7d85736b8c';
select * from dm_conversations;

-- Reset role and set non-participant user
reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
select * from dm_conversations;  -- Should return empty set

-- Clean up test data if needed
-- Clean up in reverse order of dependencies
-- delete from dm_conversations;  -- Delete conversations first
-- delete from public.users where id in ('d7bed21c-5c8c-401d-9c8d-ef8e1296c6df', 'e9d85736-9c4f-4b8c-9c4f-8c7d85736b8c');  -- Then public users
-- delete from auth.users where id in ('d7bed21c-5c8c-401d-9c8d-ef8e1296c6df', 'e9d85736-9c4f-4b8c-9c4f-8c7d85736b8c');  -- Finally auth users 