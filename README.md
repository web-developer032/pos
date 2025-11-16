# POS System

A Next.js application with Redux Toolkit for state management, libSQL for database, TypeScript, ESLint, and Prettier.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Redux Toolkit (RTK)** - State management
- **RTK Query** - API handling and data fetching
- **libSQL** - SQLite-compatible database
- **Tailwind CSS** - Styling
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
DATABASE_URL=file:./local.db
DATABASE_AUTH_TOKEN=your_auth_token_if_needed
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── Providers.tsx      # Redux Provider wrapper
├── lib/                   # Utilities and configurations
│   ├── api/              # RTK Query API slices
│   ├── db.ts             # libSQL database client
│   ├── store.ts          # Redux store configuration
│   └── hooks.ts          # Typed Redux hooks
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Database Setup

This project uses libSQL. For local development, it uses a file-based database. For production, configure your `DATABASE_URL` environment variable to point to your libSQL instance.

## State Management

Redux Toolkit is configured with RTK Query for API handling. Create API slices in `lib/api/` and use the typed hooks from `lib/hooks.ts`.

## Code Quality

- ESLint is configured with Next.js recommended rules
- Prettier is set up with Tailwind CSS plugin for class sorting
- TypeScript strict mode is enabled

