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
   Create a `.env.local` file in the root directory:

For local development (optional - will use local file database if not set):

```env
DATABASE_URL=file:./data/db/local.db
DATABASE_AUTH_TOKEN=your_auth_token_if_needed
JWT_SECRET=your-secret-key-change-in-production
```

For production/Vercel deployment:

```env
TURSO_DATABASE_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
JWT_SECRET=your-secret-key-change-in-production
```

3. Initialize the database:

```bash
pnpm run init-db
```

4. Run the development server:

```bash
pnpm run dev
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

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting
- `pnpm run init-db` - Initialize database schema and seed data

## Database Setup

This project uses libSQL (Turso).

**For local development:**

- The database is automatically stored in the `data/db` folder (default: `data/db/local.db`)
- The directory is created automatically when the application starts
- No environment variables are required for local file-based database

**For production/Vercel deployment:**

- Set `TURSO_DATABASE_URL` to your Turso database URL (e.g., `libsql://your-db.turso.io`)
- Set `TURSO_AUTH_TOKEN` to your Turso authentication token
- The application will automatically use these variables when deployed

**For Docker deployment:**

- Database is automatically persisted in a Docker volume
- See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for details

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
