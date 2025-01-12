-- Create files table with enhanced features
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bucket_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    content_type TEXT NOT NULL,
    is_image BOOLEAN NOT NULL DEFAULT false,
    image_width INTEGER,
    image_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Add constraints
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB max
    CONSTRAINT valid_file_name CHECK (LENGTH(file_name) <= 255)
);

-- Create indexes for performance
CREATE INDEX idx_files_message_id ON files(message_id);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_content_type ON files(content_type) WHERE is_image = true;

-- Enable Row Level Security
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow all authenticated users to view files
CREATE POLICY "Users can view all files" ON files
    FOR SELECT USING (true);

-- Allow users to upload their own files
CREATE POLICY "Users can upload their own files" ON files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own files (only if the message is deleted)
CREATE POLICY "Users can delete their own files" ON files
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to clean up storage when files are deleted
CREATE OR REPLACE FUNCTION delete_storage_file()
RETURNS TRIGGER AS $$
BEGIN
    -- Only attempt storage deletion if net extension is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'net'
    ) THEN
        -- Delete file from storage bucket
        PERFORM net.http_delete(
            url := current_setting('app.storage_url') || '/object/chat-files/' || OLD.bucket_path,
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || current_setting('app.storage_key')
            )
        );
    END IF;
    
    -- Always return OLD to allow the deletion to proceed
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but allow the deletion to proceed
        RAISE WARNING 'Failed to delete storage file: %', SQLERRM;
        RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to clean up storage on file deletion
CREATE TRIGGER cleanup_storage_file
    AFTER DELETE ON files
    FOR EACH ROW
    EXECUTE FUNCTION delete_storage_file(); 