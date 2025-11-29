# Quick Start Guide

Get your POS application running in minutes with Docker!

## Prerequisites

- Docker Desktop or Docker Engine installed
- At least 2GB of free RAM
- At least 5GB of free disk space

## Installation Steps

### 1. Start the Application

```bash
# Build and start
docker-compose up -d

# Or use Makefile (if available)
make up
```

### 2. Wait for Initialization

The application will:

- Build the Docker image (first time only, takes 2-5 minutes)
- Initialize the database automatically
- Start the web server

Check logs:

```bash
docker-compose logs -f
```

### 3. Access the Application

Open your browser and go to: **<http://localhost:3000>**

### 4. Login

**Default Admin Credentials:**

- Username: `admin`
- Password: `admin123`

> ⚠️ **IMPORTANT**: Change the admin password immediately after first login!

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Restart application
docker-compose restart

# Check status
docker-compose ps
```

## Database Persistence

Your database is automatically saved in a Docker volume and will persist even if you:

- Stop the container
- Restart your computer
- Update the application

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change it in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000" # Use port 8080 instead
```

### Application Won't Start

```bash
# Check logs for errors
docker-compose logs

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Issues

The database is automatically initialized on first run. If you need to reset:

```bash
# WARNING: This deletes all data!
docker-compose down -v
docker-compose up -d
```

## Next Steps

- Read [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker documentation
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment guide
- Set up regular backups (see DOCKER_SETUP.md)

## Support

For issues:

1. Check logs: `docker-compose logs -f`
2. Check status: `docker-compose ps`
3. Review documentation in DOCKER_SETUP.md
