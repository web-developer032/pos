# Docker Setup Guide

This guide explains how to run the POS application using Docker with persistent database storage.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### 1. Clone and Navigate

```bash
cd /path/to/POS
```

### 2. Build and Run

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The application will be available at `http://localhost:3000`

## Database Persistence

The database is stored in a Docker volume named `pos-database`. This ensures:

- ✅ Data persists even if the container is removed
- ✅ Data survives container restarts
- ✅ Easy backup and restore

### Viewing Database Volume (Postgres data)

When using the included `postgres` service, data is stored in the `pos-database` volume.

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect pos-database
```

For PostgreSQL backups/restores, use `pg_dump` / `pg_restore` or your host’s backup tools against the Postgres container or external DB.

## Environment Variables

The application requires **PostgreSQL**. Set `DATABASE_URL` to your Postgres connection string.

### Using the included Postgres service (default in docker-compose)

If you use the provided `docker-compose.yml`, a `postgres` service is included and `DATABASE_URL` is set automatically. No `.env` file is required for basic use.

### Using an external PostgreSQL instance

1. Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@host:5432/pos
JWT_SECRET=your-secret-key-change-in-production
```

2. In `docker-compose.yml`, ensure the `pos` service receives `DATABASE_URL` (e.g. from env_file or environment)

## Production Deployment

### Using Production Compose File

```bash
# Use production configuration
docker-compose -f docker-compose.yml -f .docker-compose.prod.yml up -d
```

### Building for Production

```bash
# Build the image
docker build -t pos-application:latest .

# Run with custom port (requires DATABASE_URL for PostgreSQL)
docker run -d \
  --name pos-app \
  -p 8080:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/pos \
  -e JWT_SECRET=your-secret-key \
  pos-application:latest
```

## Database Initialization

The database will be automatically initialized on first run. If you need to manually initialize:

```bash
# Enter the container
docker exec -it pos-application sh

# Run initialization script
pnpm run init-db

# Exit container
exit
```

## Health Check

The application includes a health check endpoint at `/api/health`. Docker will automatically monitor this.

## Troubleshooting

### View Logs

```bash
# All logs
docker-compose logs

# Follow logs
docker-compose logs -f

# Specific service logs
docker-compose logs pos-app
```

### Container Status

```bash
# Check container status
docker-compose ps

# Check container health
docker inspect pos-application | grep Health -A 10
```

### Database Issues

```bash
# Check database volume
docker volume inspect pos-database

# Access database directly (if needed)
docker exec -it pos-application sh
cd /app/data/db
ls -la
```

### Rebuild After Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Force rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

## Backup Strategy

### Automated Backup Script

Create a backup script `backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
docker run --rm -v pos-database:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/db-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
echo "Backup completed: $BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).tar.gz"
```

Make it executable:

```bash
chmod +x backup-db.sh
```

### Scheduled Backups (Linux/Mac)

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-db.sh
```

## Security Considerations

1. **Change JWT_SECRET**: Always set a strong, unique JWT secret in production
2. **Use HTTPS**: Set up a reverse proxy (nginx/traefik) for HTTPS
3. **Firewall**: Only expose necessary ports
4. **Regular Updates**: Keep Docker images updated
5. **Backup**: Implement regular database backups

## Scaling

For high-traffic deployments, consider:

- Using a managed PostgreSQL service (e.g. Vercel Postgres, Neon, AWS RDS)
- Adding a reverse proxy (nginx/traefik)
- Using Docker Swarm or Kubernetes for orchestration
- Implementing load balancing

## Support

For issues or questions, check:

- Application logs: `docker-compose logs -f`
- Container status: `docker-compose ps`
- Database volume: `docker volume inspect pos-database`
