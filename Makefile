.PHONY: help build up down logs restart clean backup restore

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build Docker image
	docker-compose build

up: ## Start the application
	docker-compose up -d

down: ## Stop the application
	docker-compose down

logs: ## View application logs
	docker-compose logs -f

restart: ## Restart the application
	docker-compose restart

clean: ## Remove containers (database in ./postgres-data is kept)
	docker-compose down
	docker system prune -f

backup: ## Backup database (./postgres-data -> backups/db-YYYYMMDD-HHMMSS.tar.gz)
	@mkdir -p backups
	@tar czf backups/db-$$(date +%Y%m%d-%H%M%S).tar.gz postgres-data 2>/dev/null || (echo "No postgres-data folder or it is empty"; exit 1)
	@echo "Backup completed in ./backups/"

restore: ## Restore database from backup (usage: make restore BACKUP=backups/db-20240101-120000.tar.gz)
	@if [ -z "$(BACKUP)" ]; then \
		echo "Usage: make restore BACKUP=backups/db-20240101-120000.tar.gz"; \
		exit 1; \
	fi
	@mkdir -p postgres-data
	@tar xzf $(BACKUP) -C .
	@echo "Database restored from $(BACKUP)"

export-volume: ## Export database for transfer to another PC
	@mkdir -p backups
	@tar czf backups/pos-database-$$(date +%Y%m%d-%H%M%S).tar.gz postgres-data 2>/dev/null || (echo "No postgres-data folder"; exit 1)
	@echo "Exported to ./backups/pos-database-*.tar.gz - copy to destination and use 'make import-volume'"

import-volume: ## Import database from backup (usage: make import-volume BACKUP=backups/pos-database-20240101-120000.tar.gz)
	@if [ -z "$(BACKUP)" ]; then \
		echo "Usage: make import-volume BACKUP=backups/pos-database-20240101-120000.tar.gz"; \
		exit 1; \
	fi
	@mkdir -p postgres-data
	@tar xzf $(BACKUP) -C .
	@echo "Database imported from $(BACKUP)"

export-image: ## Export Docker image for transfer (usage: make export-image)
	@mkdir -p backups
	@echo "Exporting Docker image..."
	@docker save pos-pos:latest -o backups/pos-app-image-$$(date +%Y%m%d-%H%M%S).tar
	@echo "Image exported to ./backups/pos-app-image-*.tar"
	@echo "Copy this file to the destination PC and use 'make import-image'"

import-image: ## Import Docker image from backup (usage: make import-image IMAGE=backups/pos-app-image-20240101-120000.tar)
	@if [ -z "$(IMAGE)" ]; then \
		echo "Usage: make import-image IMAGE=backups/pos-app-image-20240101-120000.tar"; \
		exit 1; \
	fi
	@if [ ! -f "$(IMAGE)" ]; then \
		echo "Error: Image file $(IMAGE) not found"; \
		exit 1; \
	fi
	@echo "Importing Docker image from $(IMAGE)..."
	@docker load -i $(IMAGE)
	@echo "Docker image imported successfully"

shell: ## Open shell in container
	docker exec -it pos-application sh

init-db: ## Initialize database manually
	docker exec -it pos-application tsx scripts/init-db.ts

status: ## Show container status
	docker-compose ps

health: ## Check application health
	@curl -s http://localhost:3000/api/health | jq . || echo "Health check failed"

prod: ## Start application (same as up; set JWT_SECRET/DATABASE_URL in env for production)
	docker-compose up -d

prod-build: ## Build Docker image
	docker-compose build

prod-logs: ## View application logs
	docker-compose logs -f

