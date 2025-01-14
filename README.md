# Slack Clone 2

A real-time chat application focusing on simplicity and reliability.

## Prerequisites

- Node.js 16.8 or later
- npm 7 or later
- A Supabase account
- OpenAI API key
- Pinecone account

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd slack-clone-2
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Search Configuration
OPENAI_API_KEY=your-openai-api-key
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment  # e.g., us-east-1
PINECONE_INDEX_NAME=your-pinecone-index-name   # e.g., messages-from-db
```

4. Set up the database:
- Create a new Supabase project
- Run the SQL commands from `supabase/schema.sql` in the SQL editor
- Apply any pending migrations from `supabase/migrations/` (see [MIGRATIONS.md](MIGRATIONS.md) for details)

5. Start the development server:
```bash
npm run dev
```

## Dependencies

### Core Dependencies
- next
- react
- react-dom
- react-window (for virtualized message lists)

### Development Dependencies
- typescript
- @types/node
- @types/react
- @types/react-dom
- @types/react-window
- tailwindcss
- postcss
- eslint
- eslint-config-next

### Authentication & Database
- @supabase/auth-helpers-nextjs
- @supabase/supabase-js
- @supabase/ssr

### Form Handling & Validation
- react-hook-form
- @hookform/resolvers
- zod

### UI Utilities
- tailwind-merge
- lucide-react

## Project Structure

```
.
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── chat/              # Chat pages
│   │   ├── login/             # Login page
│   │   ├── signup/            # Signup page
│   │   └── test/              # Development testing page
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── chat/              # Chat components
│   │   ├── layout/            # Layout components
│   │   └── shared/            # Shared UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions and configurations
│   ├── types/                 # TypeScript type definitions
│   └── middleware.ts          # Authentication middleware
├── supabase/
│   ├── schema.sql            # Base database schema
│   └── migrations/           # Database migrations
└── implementation_steps/     # Implementation documentation
```

## Import Aliases

The project uses TypeScript path aliases for cleaner imports:
- `@/*` maps to `./src/*`

Example:
```typescript
// Instead of
import { Button } from '../../../components/shared/Button'

// Use
import { Button } from '@/components/shared/Button'
```

## Features

- [x] User authentication (email/password)
- [x] Protected routes
- [x] Form validation
- [x] Real-time chat
- [x] Channel management
- [x] Message history
- [x] User presence/status
- [x] Virtualized message list
- [x] Automatic offline detection
- [x] AI-powered semantic message search
- [x] Message reactions
- [x] Direct messages
- [x] File attachments

## Development

1. Follow the setup instructions above
2. Make your changes
3. Run tests (coming soon)
4. Submit a pull request

## Documentation

- [MIGRATIONS.md](MIGRATIONS.md) - Database migration strategy and documentation
- [implementation_steps/](implementation_steps/) - Detailed implementation guides for features

## License

MIT
