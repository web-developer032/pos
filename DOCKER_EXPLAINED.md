# Docker Setup Explained

This document explains the Docker setup, including how to build images, the purpose of `docker-entrypoint.sh`, and why there are two docker-compose files.

## How to Build Docker Image

### Option 1: Using Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up -d --build

# Or just build without starting
docker-compose build

# Build with no cache (clean build)
docker-compose build --no-cache
```

### Option 2: Using Docker Directly

```bash
# Build the image
docker build -t pos-application:latest .

# Run the container
docker run -d \
  --name pos-app \
  -p 3000:3000 \
  -v pos-db-data:/app/data/db \
  -e JWT_SECRET=your-secret-key \
  pos-application:latest
```

### Option 3: Using Makefile

```bash
# Build the image
make build

# Build and start
make up
```

## Purpose of `docker-entrypoint.sh`

The `docker-entrypoint.sh` script **IS being used** - it's set as the `ENTRYPOINT` in the Dockerfile (line 80).

### What it does

1. **Database Initialization**: Automatically checks if the database exists and initializes it on first run
2. **Startup Logic**: Runs before the application starts
3. **Error Handling**: Ensures the database is ready before starting the app

### How it works

```bash
#!/bin/sh
# 1. Check if database exists
if [ ! -f /app/data/db/local.db ]; then
  # 2. If not, initialize it
  tsx scripts/init-db.ts
fi

# 3. Start the Next.js server
exec node server.js
```

### Why use an entrypoint script?

- **Automatic Setup**: No manual database initialization needed
- **Idempotent**: Safe to run multiple times (won't break if DB exists)
- **Custom Logic**: Can add more startup checks/initialization in the future
- **Best Practice**: Standard Docker pattern for application initialization

### Where it's used

In `Dockerfile`:

- **Line 65**: Copies the script into the image
- **Line 71**: Makes it executable
- **Line 80**: Sets it as the ENTRYPOINT (runs automatically when container starts)

## Two Docker Compose Files Explained

### 1. `docker-compose.yml` (Development/Simple)

**Purpose**: Basic setup for development or simple deployments

**Features**:

- Fixed port (3000)
- Basic environment variables
- Simple restart policy (`unless-stopped`)
- No resource limits
- Good for: Local development, testing, small deployments

**Usage**:

```bash
docker-compose up -d
```

### 2. `.docker-compose.prod.yml` (Production)

**Purpose**: Production-ready configuration with overrides

**Features**:

- Configurable port (via `PORT` environment variable)
- Resource limits (CPU and memory)
- Stricter restart policy (`always`)
- More environment variable options
- Better for: Production servers, cloud deployments

**Usage**:

```bash
# Use both files together (docker-compose.yml + overrides from .prod.yml)
docker-compose -f docker-compose.yml -f .docker-compose.prod.yml up -d

# Or use Makefile
make prod
```

### Key Differences

| Feature       | docker-compose.yml  | .docker-compose.prod.yml           |
| ------------- | ------------------- | ---------------------------------- |
| **Port**      | Fixed: `3000:3000`  | Configurable: `${PORT:-3000}:3000` |
| **Restart**   | `unless-stopped`    | `always`                           |
| **Resources** | No limits           | CPU: 1-2 cores, Memory: 1-2GB      |
| **Database**  | Local file only     | Supports Turso cloud DB            |
| **Use Case**  | Development/Testing | Production                         |

### Why Two Files?

This follows Docker Compose's **override pattern**:

1. **Base Configuration** (`docker-compose.yml`): Common settings
2. **Production Overrides** (`.docker-compose.prod.yml`): Production-specific changes

**Benefits**:

- ✅ Don't duplicate configuration
- ✅ Easy to switch between dev and prod
- ✅ Production settings don't interfere with development
- ✅ Can add more override files (e.g., `.docker-compose.staging.yml`)

## Complete Workflow Examples

### Development Workflow

```bash
# 1. Build and start
docker-compose up -d --build

# 2. View logs
docker-compose logs -f

# 3. Stop
docker-compose down
```

### Production Workflow

```bash
# 1. Create .env file with production variables
cat > .env << EOF
JWT_SECRET=your-very-secure-secret-key-here
PORT=8080
DATABASE_URL=postgresql://user:password@host:5432/pos
EOF

# 2. Build and start with production config
docker-compose -f docker-compose.yml -f .docker-compose.prod.yml up -d --build

# 3. View logs
docker-compose -f docker-compose.yml -f .docker-compose.prod.yml logs -f
```

### Using Makefile (Easier)

```bash
# Development
make build    # Build image
make up       # Start application
make logs     # View logs
make down     # Stop application

# Production
make prod-build  # Build for production
make prod        # Start with production config
make prod-logs   # View production logs
```

## File Structure Summary

```
POS/
├── Dockerfile                    # Multi-stage build definition
├── docker-entrypoint.sh          # Startup script (runs on container start)
├── docker-compose.yml            # Base configuration (dev/simple)
├── .docker-compose.prod.yml      # Production overrides
├── .dockerignore                 # Files to exclude from build
└── Makefile                     # Convenience commands
```

## Troubleshooting

### Check if entrypoint is working

```bash
# View container logs to see entrypoint output
docker-compose logs pos-app

# You should see:
# "Starting POS Application..."
# "Database not found. Initializing database..." (first time)
# OR "Database found. Skipping initialization." (subsequent runs)
# "Starting Next.js server..."
```

### Verify entrypoint is set

```bash
# Inspect the image
docker inspect pos-application | grep -A 5 "Entrypoint"

# Should show: ["/app/docker-entrypoint.sh"]
```

### Test database initialization

```bash
# Remove database volume and restart
docker-compose down -v
docker-compose up -d

# Check logs - should see database initialization
docker-compose logs -f
```

## Summary

- **docker-entrypoint.sh**: Automatically initializes database and starts the app
- **docker-compose.yml**: Simple configuration for development
- **.docker-compose.prod.yml**: Production overrides (resource limits, configurable ports, etc.)
- **Build command**: `docker-compose up -d --build` or `make build && make up`
