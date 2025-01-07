# ChatGenius PRD \- Phase 1 MVP

## Product Overview

ChatGenius is a real-time chat application focusing on simplicity and reliability. Phase 1 delivers core messaging functionality with a clean, responsive interface.

## MVP Scope

The initial release focuses on three core features:User authentication

Public channels

Real-time messaging

## Data Architecture

### Core Data Models

#### **Users**

#### users

#### \- id: uuid (primary key)

#### \- email: string (unique)

#### \- username: string (unique)

#### \- full\_name: string

#### \- created\_at: timestamp

#### Constraints:

#### \- email must be valid format

#### \- username: 3\-20 characters, alphanumeric with underscores

#### \- full\_name: 1\-50 characters

#### **Channels**

#### channels

#### \- id: uuid (primary key)

#### \- name: string

#### \- description: string (nullable)

#### \- created\_at: timestamp

#### Constraints:

#### \- name: 3\-50 characters, lowercase alphanumeric with hyphens

#### \- description: max 500 characters

#### \- unique name constraint

#### **Messages**

#### messages

#### \- id: uuid (primary key)

#### \- channel\_id: uuid (foreign key \-\> channels.id)

#### \- user\_id: uuid (foreign key \-\> users.id)

#### \- content: text

#### \- created\_at: timestamp

#### Constraints:

#### \- content: non-empty, max 4000 characters

#### \- foreign key cascading deletes

#### \- indexes on channel\_id and created\_at

### Database Relationships

### *\-- Channel Messages*

### messages.channel\_id \-\> channels.id (many-to\-one)

### *\-- User Messages*

### messages.user\_id \-\> users.id (many-to\-one)

### Real-time Subscriptions

### *// Channel level subscriptions*

### channels:{id\=eq.{channelId}}

### *// Message subscriptions*

### messages:{channel\_id\=eq.{channelId}}

## Technical Architecture

### API Layer

#### **Authentication Routes**

#### POST /api/auth/signup

#### {

####   email: string

####   password: string

####   username: string

####   full\_name: string

#### }

#### POST /api/auth/login

#### {

####   email: string

####   password: string

#### }

#### POST /api/auth/logout

#### *// Requires auth token*

#### **Channel Routes**

#### GET /api/channels

#### *// Returns: Channel\[\]*

#### *// Supports: pagination, sorting*

#### POST /api/channels

#### {

####   name: string

####   description?: string

#### }

#### GET /api/channels/:id

#### *// Returns: Channel & metadata*

#### GET /api/channels/:id/messages

#### *// Returns: Message\[\]*

#### *// Supports: pagination, cursor-based*

#### **Message Routes**

#### POST /api/messages

#### {

####   channel\_id: string

####   content: string

#### }

#### GET /api/messages/:channelId

#### *// Returns: Message\[\]*

#### *// Supports: pagination, cursor-based*

### Middleware Stack

#### **Authentication**

#### 1\. validateSession()

####    \- Verifies JWT token

####    \- Checks token expiration

####    \- Loads user context

#### 2\. requireAuth()

####    \- Guards protected routes

####    \- Handles unauthorized access

####    \- Manages redirects

#### 3\. handleAuthError()

####    \- Processes auth failures

####    \- Manages token refresh

####    \- Handles session expiry

#### **API**

#### 1\. corsMiddleware()

####    \- Manages CORS policies

####    \- Handles preflight

####    \- Sets security headers

#### 2\. validateRequest()

####    \- Input sanitization

####    \- Schema validation

####    \- Rate limiting

#### 3\. errorHandler()

####    \- Error normalization

####    \- Client\-safe messages

####    \- Error logging

### Application Structure

#### **Pages**

#### pages/

#### ├── index.tsx                    *// Landing/login*

#### ├── signup.tsx                   *// Signup*

#### ├── chat/

#### │   ├── index.tsx               *// Main chat*

#### │   └── \[channelId\].tsx         *// Channel view*

#### **Components**

#### components/

#### ├── layout/

#### │   ├── AuthLayout.tsx          *// Auth wrapper*

#### │   └── ChatLayout.tsx          *// Chat wrapper*

#### │

#### ├── auth/

#### │   ├── LoginForm.tsx           *// Login form*

#### │   └── SignupForm.tsx          *// Signup form*

#### │

#### ├── chat/

#### │   ├── ChannelList/

#### │   │   ├── ChannelList.tsx     *// Channel list*

#### │   │   └── ChannelItem.tsx     *// Channel item*

#### │   │

#### │   ├── MessageList/

#### │   │   ├── MessageList.tsx     *// Message list*

#### │   │   └── MessageItem.tsx     *// Message item*

#### │   │

#### │   ├── MessageInput.tsx        *// Message input*

#### │   └── CreateChannelModal.tsx  *// New channel*

#### │

#### └── shared/

####     ├── Button.tsx              *// Button*

####     └── Input.tsx               *// Input*

### State Management

### store/

### ├── auth.ts

### │   \- Authentication state

### │   \- User context

### │   \- Session management

### │

### ├── channels.ts

### │   \- Channel list

### │   \- Active channel

### │   \- Channel metadata

### │

### └── messages.ts

###     \- Message cache

###     \- Optimistic updates

###     \- Real\-time sync

### Implementation Phases

Project Setup

Next.js with TypeScript and Tailwind

Supabase configuration

Database schema

Project structure

Authentication

Email/password auth

Protected routes

Session management

Auth middleware

Chat Interface

Responsive layout

Channel list

Navigation

UI components

Messaging

Message list with virtual scrolling

Message input

Optimistic updates

Pagination

Real-time Features

Supabase subscriptions

Message broadcasting

Connection management

Offline handling

Channel Management

Channel creation

Channel listing

Join functionality

Validation

Polish

Error handling

Loading states

Performance optimization

Cross-browser testing

## Development Guidelines

### Performance

Implement message pagination

Use virtual scrolling

Optimize real-time subscriptions

Implement optimistic updates

### Security

JWT authentication

Input sanitization

Rate limiting

Secure WebSocket connections

### Reliability

Offline message queue

Automatic reconnection

Error recovery

Data validation

### Development Practices

Mobile-first design

Accessibility compliance

Progressive enhancement

Comprehensive error handling

Clear documentation

## Post-MVP Features

### Phase 2

Workspaces

Direct messaging

Message threading

Basic presence

### Phase 3

Message search

File sharing

Emoji reactions

Private channels

### Phase 4

Rich text editing

Message editing

Advanced presence

Group DMs

### Phase 5

Advanced admin controls

Multiple workspaces

User profiles

Advanced threading

This PRD serves as our primary reference during development, ensuring we maintain focus on MVP features while building a solid foundation for future enhancements.