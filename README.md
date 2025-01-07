# ChatGenius

A real-time chat application focusing on simplicity and reliability.

## Prerequisites

- Node.js 16.8 or later
- npm 7 or later
- A Supabase account

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd chatgenius
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Set up the database:
- Create a new Supabase project
- Run the SQL commands from `supabase/schema.sql` in the SQL editor

5. Start the development server:
```bash
npm run dev
```

## Dependencies

### Core Dependencies
- next
- react
- react-dom

### Development Dependencies
- typescript
- @types/node
- @types/react
- @types/react-dom
- tailwindcss
- postcss
- eslint
- eslint-config-next

### Authentication & Database
- @supabase/auth-helpers-nextjs
- @supabase/supabase-js

### Form Handling & Validation
- react-hook-form
- @hookform/resolvers
- zod

### UI Utilities
- tailwind-merge

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── chat/              # Chat pages
│   ├── login/             # Login page
│   └── signup/            # Signup page
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── chat/              # Chat components
│   ├── layout/            # Layout components
│   └── shared/            # Shared UI components
├── lib/                   # Utility functions and configurations
└── middleware.ts         # Authentication middleware
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
- [ ] Real-time chat
- [ ] Channel management
- [ ] Message history

## Development

1. Follow the setup instructions above
2. Make your changes
3. Run tests (coming soon)
4. Submit a pull request

## License

MIT
