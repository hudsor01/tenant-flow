#!/bin/bash

# n8n Stack Manager
# Manages the complete n8n workflow automation stack

set -e

COMPOSE_FILE="docker-compose-n8n-stack.yml"
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.n8n-stack .env
        print_warning "Please edit .env file with your settings before continuing!"
        exit 1
    fi
    
    print_success "Requirements check passed"
}

start_stack() {
    print_status "Starting n8n stack..."
    
    # Create shared content directory
    mkdir -p ./shared-content
    
    # Start all services
    docker-compose -f $COMPOSE_FILE up -d
    
    print_success "n8n stack started successfully!"
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    until docker exec postgres pg_isready -U postgres > /dev/null 2>&1; do
        printf "."
        sleep 2
    done
    echo ""
    print_success "PostgreSQL is ready!"
    
    print_status "Service URLs:"
    echo "🔧 n8n:          http://192.168.0.177:5678"
    echo "🤖 Ollama:       http://192.168.0.177:11434"
    echo "🗄️  NocoDB:       http://192.168.0.177:8088"
    echo "📧 Listmonk:     http://192.168.0.177:9000"
    echo "📄 Stirling PDF: http://192.168.0.177:8082"
    echo "🔍 MeiliSearch:  http://192.168.0.177:7700"
    echo "📝 Ghost:        http://192.168.0.177:2368"
    echo "🎨 Penpot:       http://192.168.0.177:9001"
    echo "🗃️  Qdrant:       http://192.168.0.177:6333"
    echo "🔄 Temporal:     http://192.168.0.177:8233"
    echo "📊 Excalidraw:   http://192.168.0.177:3000"
    
    print_status "Container access patterns for n8n workflows:"
    echo "🔗 Ollama:       http://ollama:11434"
    echo "🔗 NocoDB:       http://nocodb:8088"
    echo "🔗 Listmonk:     http://listmonk:9000"
    echo "🔗 Stirling PDF: http://stirling-pdf:8080"
    echo "🔗 MeiliSearch:  http://meilisearch:7700"
    echo "🔗 Ghost:        http://ghost:2368"
    echo "🔗 Qdrant:       http://qdrant:6333"
}

stop_stack() {
    print_status "Stopping n8n stack..."
    docker-compose -f $COMPOSE_FILE down
    print_success "Stack stopped"
}

restart_stack() {
    print_status "Restarting n8n stack..."
    stop_stack
    start_stack
}

show_logs() {
    SERVICE=${1:-}
    if [ -z "$SERVICE" ]; then
        docker-compose -f $COMPOSE_FILE logs -f
    else
        docker-compose -f $COMPOSE_FILE logs -f $SERVICE
    fi
}

show_status() {
    print_status "n8n Stack Status:"
    docker-compose -f $COMPOSE_FILE ps
}

cleanup() {
    print_warning "This will remove all containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        docker-compose -f $COMPOSE_FILE down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

backup_data() {
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    print_status "Creating backup in $BACKUP_DIR..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup PostgreSQL
    docker exec postgres pg_dumpall -U postgres > "$BACKUP_DIR/postgres_backup.sql"
    
    # Backup MySQL
    docker exec ghost-mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} --all-databases > "$BACKUP_DIR/mysql_backup.sql" 2>/dev/null || echo "MySQL backup skipped (check if Ghost is running)"
    
    # Backup key volumes
    docker run --rm -v n8n_n8n_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/n8n_data.tar.gz -C /data .
    docker run --rm -v n8n_ollama_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/ollama_data.tar.gz -C /data .
    docker run --rm -v n8n_ghost_content:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/ghost_content.tar.gz -C /data . 2>/dev/null || echo "Ghost content backup skipped"
    docker run --rm -v n8n_meilisearch_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/meilisearch_data.tar.gz -C /data . 2>/dev/null || echo "MeiliSearch backup skipped"
    docker run --rm -v n8n_qdrant_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/qdrant_data.tar.gz -C /data . 2>/dev/null || echo "Qdrant backup skipped"
    
    print_success "Backup completed: $BACKUP_DIR"
}

setup_ollama() {
    print_status "Setting up Ollama with required models..."
    
    # Wait for Ollama to be ready
    until docker exec ollama ollama list > /dev/null 2>&1; do
        printf "."
        sleep 5
    done
    echo ""
    
    # Pull required models
    print_status "Pulling llama3.2 model (this may take a few minutes)..."
    docker exec ollama ollama pull llama3.2
    
    print_success "Ollama setup completed"
}

health_check() {
    print_status "Checking service health..."
    
    services=("n8n:5678/healthz" "ollama:11434/api/tags" "nocodb:8088" "listmonk:9000/api/health")
    
    for service in "${services[@]}"; do
        IFS=':' read -r container endpoint <<< "$service"
        if docker exec $container wget --spider -q localhost:$endpoint 2>/dev/null; then
            print_success "$container is healthy"
        else
            print_error "$container is not responding"
        fi
    done
}

case "${1:-}" in
    "start")
        check_requirements
        start_stack
        setup_ollama
        ;;
    "stop")
        stop_stack
        ;;
    "restart")
        restart_stack
        ;;
    "logs")
        show_logs $2
        ;;
    "status")
        show_status
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    "backup")
        backup_data
        ;;
    "setup-ollama")
        setup_ollama
        ;;
    *)
        echo "n8n Stack Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|logs|status|health|cleanup|backup|setup-ollama}"
        echo ""
        echo "Commands:"
        echo "  start         - Start the complete n8n stack"
        echo "  stop          - Stop all services"
        echo "  restart       - Restart all services"
        echo "  logs [service] - Show logs (optional: for specific service)"
        echo "  status        - Show service status"
        echo "  health        - Check service health"
        echo "  cleanup       - Remove all containers and volumes"
        echo "  backup        - Backup all data"
        echo "  setup-ollama  - Setup Ollama with required models"
        echo ""
        echo "Container names for logs:"
        echo "  n8n, ollama, postgres, nocodb, listmonk, stirling-pdf"
        echo "  meilisearch, ghost, penpot-frontend, qdrant, temporal, excalidraw"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs n8n"
        echo "  $0 health"
        ;;
esac