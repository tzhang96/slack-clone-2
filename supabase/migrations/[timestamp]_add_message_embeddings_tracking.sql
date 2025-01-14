create table message_embedding_status (
    message_id uuid references messages(id) primary key,
    embedding_id text,  -- Pinecone vector ID
    processed_at timestamp with time zone default now(),
    status text check (status in ('pending', 'completed', 'failed')),
    error_message text
);

-- Index for faster queries
create index idx_message_embedding_status_status on message_embedding_status(status); 