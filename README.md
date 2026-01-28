# POS System

A Next.js application with Redux Toolkit for state management, PostgreSQL via Prisma for the database, TypeScript, ESLint, and Prettier.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Redux Toolkit (RTK)** - State management
- **RTK Query** - API handling and data fetching
- **PostgreSQL + Prisma** - Database (Prisma ORM, migrations, single `DATABASE_URL`)
- **Tailwind CSS** - Styling
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Quick Start with Docker (Recommended)

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

### Run with Docker

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The application will be available at `http://localhost:3000`

**Default Admin Credentials:**

- Username: `admin`
- Password: `admin123`

> ⚠️ **Important**: Change the default admin password after first login!

### Database Persistence

The database is automatically stored in a Docker volume (`pos-database`) and persists across container restarts and updates.

**Transferring to Another PC?** See [DOCKER_VOLUME_TRANSFER.md](./DOCKER_VOLUME_TRANSFER.md) for step-by-step instructions.

For detailed Docker setup instructions, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)

## Local Development Setup

### Prerequisites

- Node.js 18+ and pnpm

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:
   Create a `.env` or `.env.local` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/pos
JWT_SECRET=your-secret-key-change-in-production
```

Use a local PostgreSQL instance or a hosted one (e.g. Vercel Postgres, Neon, Supabase). For Vercel deployment, set `DATABASE_URL` in the project environment (Vercel Postgres provides it automatically).

3. Run the development server (database is created automatically if missing, migrations and seed run on first start):

```bash
pnpm run dev
```

Or to set up manually first: `pnpm run db:migrate` then `pnpm run init-db`.

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
│   ├── db.ts             # Prisma client singleton
│   ├── store.ts          # Redux store configuration
│   └── hooks.ts          # Typed Redux hooks
└── public/               # Static assets
```

## Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting
- `pnpm run init-db` - Seed database (run after migrations)
- `pnpm run db:migrate` - Run Prisma migrations (dev)
- `pnpm run db:seed` - Run seed script

## Database Setup

This project uses **PostgreSQL** with **Prisma** (schema in `prisma/schema.prisma`, migrations in `prisma/migrations/`).

- **Required:** Set `DATABASE_URL` to a PostgreSQL connection string (e.g. `postgresql://user:password@host:5432/dbname`).
- **Local:** Use a local Postgres instance or a hosted one (Neon, Supabase, etc.).
- **Vercel:** Use Vercel Postgres or any Postgres; set `DATABASE_URL` in project settings.
- **Migrations:** Run `pnpm run db:migrate` in development; in production use `prisma migrate deploy` (e.g. in build or release).
- **Seed:** Run `pnpm run init-db` or `pnpm run db:seed` after migrations to load default data (e.g. admin user).

**Docker:** See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for running with PostgreSQL in Docker.

## Docker Deployment

### Quick Start

```bash
docker-compose up -d
```

### Production Deployment

```bash
# Use production configuration
docker-compose -f docker-compose.yml -f .docker-compose.prod.yml up -d
```

### Database Backup

```bash
# Backup database volume
docker run --rm -v pos-database:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz -C /data .
```

For complete Docker documentation, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)

## State Management

Redux Toolkit is configured with RTK Query for API handling. Create API slices in `lib/api/` and use the typed hooks from `lib/hooks.ts`.

## Code Quality

- ESLint is configured with Next.js recommended rules
- Prettier is set up with Tailwind CSS plugin for class sorting
- TypeScript strict mode is enabled

## Security Notes

- Change the default admin password immediately after first login
- Set a strong `JWT_SECRET` in production
- Use HTTPS in production
- Regularly backup your database

## Support

For Docker-related issues, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)
