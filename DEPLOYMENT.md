# Deployment Guide

This guide covers deploying the POS application to production environments.

## Docker Deployment (Recommended)

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- At least 5GB disk space

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd POS

# Start the application
make up

# Or manually:
docker-compose up -d
```

The application will be available at `http://localhost:3000`

### Production Deployment

1. **Set Environment Variables**

Create a `.env` file:

```env
# JWT Secret (REQUIRED - Change this!)
JWT_SECRET=your-very-secure-secret-key-minimum-32-characters

# Database (REQUIRED - PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/pos

# Application Port
PORT=3000
```

2. **Start with Production Configuration**

```bash
make prod

# Or manually:
docker-compose -f docker-compose.yml -f .docker-compose.prod.yml up -d
```

### Database Management

#### Backup Database

```bash
# Automatic backup
make backup

# Manual backup
docker run --rm -v pos-database:/data -v $(pwd)/backups:/backup alpine \
  tar czf /backup/db-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

#### Restore Database

```bash
# Restore from backup
make restore BACKUP=backups/db-20240101-120000.tar.gz

# Manual restore
docker run --rm -v pos-database:/data -v $(pwd):/backup alpine \
  sh -c "cd /data && tar xzf /backup/backups/db-20240101-120000.tar.gz"
```

#### Initialize Database

The database is automatically initialized on first run. To manually initialize:

```bash
make init-db

# Or manually:
docker exec -it pos-application tsx scripts/init-db.ts
```

### Monitoring

#### View Logs

```bash
# Follow logs
make logs

# Or manually:
docker-compose logs -f
```

#### Check Status

```bash
# Container status
make status

# Health check
make health
```

### Maintenance

#### Restart Application

```bash
make restart
```

#### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

#### Clean Up

```bash
# Remove containers and volumes (WARNING: Deletes database!)
make clean
```

## Deployment Options

### Option 1: Single Server Deployment

Best for small to medium businesses.

**Requirements:**

- 1 server with Docker
- 2GB+ RAM
- 10GB+ disk space

**Steps:**

1. Install Docker and Docker Compose
2. Clone repository
3. Configure environment variables
4. Run `docker-compose up -d`

### Option 2: Cloud Deployment (AWS, Azure, GCP)

Best for scalability and reliability.

**Recommended Setup:**

- Use managed PostgreSQL (Vercel Postgres, Neon, AWS RDS, etc.)
- Use container orchestration (ECS, Kubernetes)
- Set up load balancing
- Configure auto-scaling

**Example AWS ECS:**

```bash
# Build and push to ECR
docker build -t pos-application .
docker tag pos-application:latest <account>.dkr.ecr.<region>.amazonaws.com/pos:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/pos:latest

# Deploy to ECS
aws ecs update-service --cluster pos-cluster --service pos-service --force-new-deployment
```

### Option 3: VPS Deployment (DigitalOcean, Linode, etc.)

Best for cost-effective deployment.

**Steps:**

1. Create VPS instance (2GB RAM minimum)
2. Install Docker and Docker Compose
3. Clone repository
4. Configure environment variables
5. Run `docker-compose up -d`
6. Set up reverse proxy (nginx) for HTTPS
7. Configure firewall

## Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET (minimum 32 characters)
- [ ] Use HTTPS (set up reverse proxy)
- [ ] Configure firewall (only expose port 80/443)
- [ ] Set up regular database backups
- [ ] Enable Docker security best practices
- [ ] Use secrets management for sensitive data
- [ ] Regular security updates
- [ ] Monitor application logs
- [ ] Set up failover/backup strategy

## Reverse Proxy Setup (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backup Strategy

### Automated Backups

Create a cron job for daily backups:

```bash
# Add to crontab (crontab -e)
0 2 * * * cd /path/to/POS && make backup
```

### Backup Retention

- Daily backups: Keep for 7 days
- Weekly backups: Keep for 4 weeks
- Monthly backups: Keep for 12 months

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose logs -f

# Check container status
docker-compose ps

# Check database volume
docker volume inspect pos-database
```

### Database Issues

```bash
# Check database file
docker exec -it pos-application ls -la /app/data/db

# Reinitialize database (WARNING: Deletes data!)
docker-compose down -v
docker-compose up -d
```

### Port Already in Use

```bash
# Change port in docker-compose.yml
ports:
  - "8080:3000"  # Use port 8080 instead
```

### Out of Memory

```bash
# Increase memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 4G
```

## Support

For deployment issues:

1. Check application logs: `make logs`
2. Check container health: `make health`
3. Review [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker documentation
