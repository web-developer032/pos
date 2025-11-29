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

### Viewing Database Volume

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect pos-database

# Backup database
docker run --rm -v pos-database:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz -C /data .
```

### Restoring Database

```bash
# Restore from backup
docker run --rm -v pos-database:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/db-backup.tar.gz"
```

## Environment Variables

### Option 1: Local File Database (Default)

The application uses a local SQLite database stored in the Docker volume. No additional configuration needed.

### Option 2: Turso Cloud Database

For production deployments, you can use Turso cloud database:

1. Create a `.env` file:

```env
TURSO_DATABASE_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
JWT_SECRET=your-secret-key-change-in-production
```

2. Update `docker-compose.yml` to use these variables (uncomment the environment lines)

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

# Run with custom port
docker run -d \
  --name pos-app \
  -p 8080:3000 \
  -v pos-db-data:/app/data/db \
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

- Using Turso cloud database instead of local file
- Adding a reverse proxy (nginx/traefik)
- Using Docker Swarm or Kubernetes for orchestration
- Implementing load balancing

## Support

For issues or questions, check:

- Application logs: `docker-compose logs -f`
- Container status: `docker-compose ps`
- Database volume: `docker volume inspect pos-database`
