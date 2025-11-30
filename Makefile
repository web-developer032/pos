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

clean: ## Remove containers and volumes (WARNING: Deletes database!)
	docker-compose down -v
	docker system prune -f

backup: ## Backup database
	@mkdir -p backups
	@docker run --rm -v pos-database:/data -v $(PWD)/backups:/backup alpine tar czf /backup/db-$$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@echo "Backup completed in ./backups/"

restore: ## Restore database from backup (usage: make restore BACKUP=backups/db-20240101-120000.tar.gz)
	@if [ -z "$(BACKUP)" ]; then \
		echo "Usage: make restore BACKUP=backups/db-20240101-120000.tar.gz"; \
		exit 1; \
	fi
	@docker run --rm -v pos-database:/data -v $(PWD):/backup alpine sh -c "cd /data && tar xzf /backup/$(BACKUP)"
	@echo "Database restored from $(BACKUP)"

export-volume: ## Export database volume for transfer to another PC
	@mkdir -p backups
	@echo "Exporting database volume..."
	@docker run --rm -v pos-database:/data -v $(PWD)/backups:/backup alpine tar czf /backup/pos-database-$$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@echo "Volume exported to ./backups/pos-database-*.tar.gz"
	@echo "Copy this file to the destination PC and use 'make import-volume'"

import-volume: ## Import database volume from backup (usage: make import-volume BACKUP=backups/pos-database-20240101-120000.tar.gz)
	@if [ -z "$(BACKUP)" ]; then \
		echo "Usage: make import-volume BACKUP=backups/pos-database-20240101-120000.tar.gz"; \
		exit 1; \
	fi
	@if [ ! -f "$(BACKUP)" ]; then \
		echo "Error: Backup file $(BACKUP) not found"; \
		exit 1; \
	fi
	@echo "Creating volume if it doesn't exist..."
	@docker volume create pos-database 2>/dev/null || true
	@echo "Importing database from $(BACKUP)..."
	@docker run --rm -v pos-database:/data -v $(PWD):/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/$(BACKUP)"
	@echo "Database volume imported successfully from $(BACKUP)"

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

prod: ## Start with production configuration
	docker-compose -f docker-compose.yml -f .docker-compose.prod.yml up -d

prod-build: ## Build for production
	docker-compose -f docker-compose.yml -f .docker-compose.prod.yml build

prod-logs: ## View production logs
	docker-compose -f docker-compose.yml -f .docker-compose.prod.yml logs -f

