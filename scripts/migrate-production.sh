#!/bin/bash

# Production Database Migration Script for TenantFlow
# This script handles database migrations in production environments safely

set -e
set -u
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$BACKUP_DIR/migration-$(date +%Y%m%d_%H%M%S).log"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check required environment variables
check_env() {
    log "Checking environment variables..."
    
    if [[ -z "${DATABASE_URL:-}" ]]; then
        error "DATABASE_URL environment variable is required"
    fi
    
    if [[ -z "${NODE_ENV:-}" ]]; then
        warning "NODE_ENV not set, assuming production"
        export NODE_ENV=production
    fi
    
    success "Environment variables validated"
}

# Test database connectivity
test_db_connection() {
    log "Testing database connectivity..."
    
    cd "$PROJECT_ROOT/packages/database"
    
    if npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        success "Database connection successful"
    else
        error "Failed to connect to database. Check DATABASE_URL and network connectivity."
    fi
}

# Create database backup
backup_database() {
    log "Creating database backup..."
    
    local backup_file="$BACKUP_DIR/backup-$(date +%Y%m%d_%H%M%S).sql"
    
    # Extract database connection details from DATABASE_URL
    if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        local user="${BASH_REMATCH[1]}"
        local password="${BASH_REMATCH[2]}"
        local host="${BASH_REMATCH[3]}"
        local port="${BASH_REMATCH[4]}"
        local dbname="${BASH_REMATCH[5]}"
        
        # Remove any query parameters from dbname
        dbname="${dbname%%\?*}"
        
        log "Creating backup: $backup_file"
        
        PGPASSWORD="$password" pg_dump \
            -h "$host" \
            -p "$port" \
            -U "$user" \
            -d "$dbname" \
            --no-password \
            --verbose \
            --clean \
            --if-exists \
            > "$backup_file" 2>>"$LOG_FILE"
        
        if [[ -f "$backup_file" && -s "$backup_file" ]]; then
            success "Database backup created: $backup_file"
            # Compress backup to save space
            gzip "$backup_file"
            success "Backup compressed: ${backup_file}.gz"
        else
            error "Failed to create database backup"
        fi
    else
        error "Invalid DATABASE_URL format. Expected postgresql://user:pass@host:port/dbname"
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    cd "$PROJECT_ROOT/packages/database"
    
    # Generate Prisma client first
    log "Generating Prisma client..."
    npx prisma generate >> "$LOG_FILE" 2>&1
    
    # Deploy migrations
    log "Deploying migrations..."
    npx prisma migrate deploy >> "$LOG_FILE" 2>&1
    
    success "Database migrations completed successfully"
}

# Verify migration status
verify_migrations() {
    log "Verifying migration status..."
    
    cd "$PROJECT_ROOT/packages/database"
    
    # Check migration status
    npx prisma migrate status >> "$LOG_FILE" 2>&1
    
    success "Migration verification completed"
}

# Update database schema if needed
update_schema() {
    log "Checking for schema updates..."
    
    cd "$PROJECT_ROOT/packages/database"
    
    # Push schema changes (for development/staging)
    if [[ "${NODE_ENV:-production}" != "production" ]]; then
        log "Pushing schema changes (non-production environment)..."
        npx prisma db push >> "$LOG_FILE" 2>&1
        success "Schema updated"
    else
        log "Skipping schema push in production environment"
    fi
}

# Cleanup old backups (keep last 10)
cleanup_backups() {
    log "Cleaning up old backups..."
    
    cd "$BACKUP_DIR"
    
    # Keep only the last 10 backup files
    ls -t backup-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
    
    success "Backup cleanup completed"
}

# Main execution
main() {
    log "Starting production database migration process..."
    log "Project root: $PROJECT_ROOT"
    log "Backup directory: $BACKUP_DIR"
    log "Log file: $LOG_FILE"
    
    # Pre-migration checks
    check_env
    test_db_connection
    
    # Create backup before migration
    if [[ "${SKIP_BACKUP:-false}" != "true" ]]; then
        backup_database
    else
        warning "Skipping database backup (SKIP_BACKUP=true)"
    fi
    
    # Run migrations
    run_migrations
    
    # Post-migration verification
    verify_migrations
    
    # Update schema if needed
    update_schema
    
    # Cleanup
    cleanup_backups
    
    success "Production database migration completed successfully!"
    log "Log file saved: $LOG_FILE"
}

# Handle script interruption
trap 'error "Migration interrupted by user"' INT TERM

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            export SKIP_BACKUP=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --skip-backup    Skip database backup before migration"
            echo "  --help, -h       Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Execute main function
main "$@"