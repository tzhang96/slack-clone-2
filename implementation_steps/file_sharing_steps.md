## High-Level Overview

To add file sharing, you'll build an upload feature that allows users to select a file, upload it to a secure storage, and send a message containing a link (and/or preview) of that file. The main components involved include:

1. A UI element (e.g., a button or icon) to trigger file selection.  
2. Supabase storage for secure file storage with proper access controls.  
3. A dedicated `files` table to track file metadata and maintain relationships.  
4. A rendering logic in the chat UI to display files appropriately.

This approach keeps the user experience consistent with standard messaging apps: files appear in the chat history alongside text messages, and users can preview or download them quickly.

---

## Detailed Step-by-Step Instructions

1. **Set Up File Storage in Supabase Dashboard**
   - Navigate to Storage in the Supabase dashboard
   - Create a new bucket named "chat-files"
   - Configure bucket as private (not public)
   - Add the following storage policies:
     ```sql
     -- Allow authenticated users to view files
     (auth.role() = 'authenticated')  -- for SELECT

     -- Allow authenticated users to upload files
     (auth.role() = 'authenticated')  -- for INSERT

     -- Allow authenticated users to delete their files
     (auth.role() = 'authenticated')  -- for DELETE
     ```
   - Note: No UPDATE policy as files are immutable

2. **Database Schema**
   - Files table with enhanced metadata:
     ```sql
     CREATE TABLE files (
         id UUID PRIMARY KEY,
         message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
         user_id UUID REFERENCES users(id) ON DELETE CASCADE,
         bucket_path TEXT NOT NULL,
         file_name TEXT NOT NULL,
         file_size BIGINT NOT NULL,
         content_type TEXT NOT NULL,
         is_image BOOLEAN NOT NULL DEFAULT false,
         image_width INTEGER,
         image_height INTEGER,
         created_at TIMESTAMP WITH TIME ZONE,
         -- Constraints
         CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB max
         CONSTRAINT valid_file_name CHECK (LENGTH(file_name) <= 255)
     );
     ```
   - Key features:
     - Automatic cleanup via CASCADE delete
     - File size limit of 10MB
     - Special handling for images
     - Immutable files (no updates allowed)
     - Automatic storage cleanup via triggers

3. **Add Front-End UI for File Upload**
   - Place a small "Attach File" icon near your "MessageInput" component
   - Implement drag-and-drop support for better UX
   - Show file type restrictions and size limits
   - Add upload progress indicator
   - Example styling:
     ```tsx
     <button className="absolute top-0 right-0 mr-2 mt-2 text-gray-600 hover:text-gray-800">
       <PaperclipIcon className="w-5 h-5" />
     </button>
     ```

4. **Implement File Upload Logic**
   - In your MessageInput component:
     - Handle file selection events
     - Validate file size and type
     - Upload to Supabase storage
     - Create file record in database
     - Show upload progress
   - Key validations:
     - Maximum file size: 10MB
     - Allowed file types
     - Valid file names

5. **Display Files in Chat**
   - Enhance MessageList/MessageItem to handle files:
     - For images:
       - Show thumbnails with lazy loading
       - Click to view full size
       - Show dimensions if available
     - For other files:
       - Show file icon based on type
       - Display file name and size
       - Download button/link
   - Example preview:
     ```tsx
     {isImage ? (
       <img 
         src={url} 
         alt={fileName}
         className="max-w-sm rounded-lg shadow-md" 
         loading="lazy"
       />
     ) : (
       <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
         <FileIcon className="w-5 h-5" />
         <span>{fileName}</span>
         <span className="text-sm text-gray-500">
           ({formatFileSize(fileSize)})
         </span>
       </div>
     )}
     ```

6. **Error Handling & UX**
   - Show clear error messages for:
     - File too large
     - Invalid file type
     - Upload failures
   - Implement retry logic for failed uploads
   - Show upload progress
   - Allow cancel during upload
   - Handle offline state gracefully

7. **Security Considerations**
   - Files are immutable once uploaded
   - Only authenticated users can upload
   - 10MB file size limit
   - Automatic cleanup when messages are deleted
   - Secure file URLs through Supabase
   - Proper content type validation

8. **Testing**
   - Test file upload with various:
     - File types
     - File sizes
     - Network conditions
   - Verify cleanup works properly
   - Test concurrent uploads
   - Verify mobile compatibility
   - Check error handling

By following these steps, you'll implement a secure and user-friendly file sharing system that integrates seamlessly with the chat experience. Files are handled as immutable resources, similar to messages, maintaining chat history integrity while providing a familiar user experience.
