# Docker Volume Transfer Guide

This guide explains how to transfer your POS application Docker container and database volume to another PC.

## Overview

When you want to move your application to another PC, you need to:

1. **Export** the Docker volume (database) from the source PC
2. **Transfer** the exported files to the destination PC
3. **Import** the volume on the destination PC
4. **Build and run** the container on the destination PC

## Method 1: Using Makefile Commands (Recommended)

### On Source PC (Export)

1. **Stop the container** (if running):

   ```bash
   make down
   ```

2. **Export the database volume**:

   ```bash
   make export-volume
   ```

   This creates a backup file in `./backups/pos-database-YYYYMMDD-HHMMSS.tar.gz`

3. **Export the Docker image** (optional, if you want to transfer the built image):

   ```bash
   make export-image
   ```

   This creates `./backups/pos-app-image-YYYYMMDD-HHMMSS.tar`

4. **Transfer files to destination PC**:
   - Copy the database backup: `backups/pos-database-*.tar.gz`
   - Copy the image backup (if exported): `backups/pos-app-image-*.tar`
   - Copy the entire project folder (or at minimum: `docker-compose.yml`, `Dockerfile`, `.dockerignore`, and `docker-entrypoint.sh`)

### On Destination PC (Import)

1. **Ensure Docker and Docker Compose are installed**

2. **Place the project files** in a directory

3. **Import the database volume**:

   ```bash
   make import-volume BACKUP=backups/pos-database-YYYYMMDD-HHMMSS.tar.gz
   ```

4. **Import the Docker image** (if you exported it):

   ```bash
   make import-image IMAGE=backups/pos-app-image-YYYYMMDD-HHMMSS.tar
   ```

   Or build it fresh:

   ```bash
   make build
   ```

5. **Start the application**:

   ```bash
   make up
   ```

6. **Verify it's working**:

   ```bash
   make health
   ```

## Method 2: Manual Docker Commands

### On Source PC (Export)

1. **Stop the container**:

   ```bash
   docker-compose down
   ```

2. **Export the volume**:

   ```bash
   docker run --rm -v pos-database:/data -v $(pwd)/backups:/backup alpine tar czf /backup/pos-database-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
   ```

3. **Export the image** (optional):

   ```bash
   docker save pos-pos:latest -o backups/pos-app-image-$(date +%Y%m%d-%H%M%S).tar
   ```

### On Destination PC (Import)

1. **Create the volume** (if it doesn't exist):

   ```bash
   docker volume create pos-database
   ```

2. **Import the database**:

   ```bash
   docker run --rm -v pos-database:/data -v $(pwd)/backups:/backup alpine sh -c "cd /data && tar xzf /backup/pos-database-YYYYMMDD-HHMMSS.tar.gz"
   ```

3. **Import the image** (if exported):

   ```bash
   docker load -i backups/pos-app-image-YYYYMMDD-HHMMSS.tar
   ```

4. **Start the application**:

   ```bash
   docker-compose up -d
   ```

## Method 3: Using Docker Compose with Bind Mount (Alternative)

If you prefer to use a bind mount instead of a named volume, you can modify `docker-compose.yml`:

```yaml
volumes:
  - ./data/db:/app/data/db # Direct bind mount
```

Then you can simply copy the `./data/db` folder to the destination PC.

**Note**: This method is simpler but less portable than using named volumes.

## Troubleshooting

### Volume doesn't exist on destination PC

If you get an error that the volume doesn't exist:

```bash
docker volume create pos-database
```

### Permission issues

If you encounter permission issues on Linux:

```bash
sudo chown -R $USER:$USER ./data/db
```

### Container won't start

1. Check logs:

   ```bash
   make logs
   ```

2. Verify the database file exists:

   ```bash
   docker exec pos-application ls -la /app/data/db/
   ```

3. Check volume mount:

   ```bash
   docker volume inspect pos-database
   ```

## Best Practices

1. **Always backup before transferring**: Use `make backup` to create a backup before export
2. **Test on destination**: Verify the application works before removing from source PC
3. **Keep backups**: Don't delete backups until you've confirmed everything works on the new PC
4. **Document environment variables**: Make sure to note any custom environment variables (like `JWT_SECRET`) that need to be set

## Quick Transfer Checklist

- [ ] Stop container on source PC (`make down`)
- [ ] Export database volume (`make export-volume`)
- [ ] Export Docker image (optional, `make export-image`)
- [ ] Copy backup files to destination PC
- [ ] Copy project files to destination PC
- [ ] Import database volume on destination PC (`make import-volume`)
- [ ] Import or build Docker image on destination PC
- [ ] Start application on destination PC (`make up`)
- [ ] Verify application is working (`make health`)
- [ ] Test login and data access
