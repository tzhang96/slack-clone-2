# Database

## Schema Overview

The database uses Supabase (PostgreSQL) with the following key features:
- UUID primary keys for all tables
- Timestamp tracking for all records
- Foreign key constraints for referential integrity
- Row Level Security (RLS) for data protection
- Optimized indexes for common queries

## Tables

### users
The core table storing user account information with secure authentication integration.

**Attributes:**
- `id` (UUID, PK): Unique identifier linked to auth.users
- `email` (VARCHAR(255)): User's email address, must be unique and valid format
- `username` (VARCHAR(20)): Unique username, alphanumeric with underscores
- `full_name` (VARCHAR(50)): User's full name, 1-50 characters
- `created_at` (TIMESTAMP): Account creation timestamp

**Indexes:**
- Primary Key on `id`
- Unique index on `email`
- Unique index on `username`

### channels
A central table managing chat channels with support for real-time collaboration.

**Attributes:**
- `id` (UUID, PK): Unique identifier for the channel
- `name` (VARCHAR(50)): Unique channel name, lowercase alphanumeric with hyphens
- `description` (VARCHAR(500)): Optional channel description
- `created_at` (TIMESTAMP): Channel creation timestamp

**Indexes:**
- Primary Key on `id`
- Unique index on `name`

### messages
A high-performance table storing all chat messages with proper relationships and constraints.

**Attributes:**
- `id` (UUID, PK): Unique identifier for the message
- `channel_id` (UUID, FK): Reference to channels table
- `user_id` (UUID, FK): Reference to users table
- `content` (TEXT): Message content, 1-4000 characters
- `created_at` (TIMESTAMP): Message creation timestamp

**Indexes:**
- Primary Key on `id`
- Index on `channel_id` for faster channel message queries
- Index on `created_at` for efficient message ordering and pagination

## Security

### Row Level Security (RLS) Policies

#### Users Table
- SELECT: All authenticated users can view all users
- INSERT: Users can only insert their own profile
- UPDATE: Users can only update their own profile

#### Channels Table
- SELECT: All authenticated users can view all channels
- INSERT: All authenticated users can create channels
- DELETE: All authenticated users can delete channels

#### Messages Table
- SELECT: All authenticated users can view messages
- INSERT: Users can only insert messages with their own user_id 