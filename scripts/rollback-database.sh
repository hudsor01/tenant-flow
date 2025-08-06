#!/bin/bash

# Database Rollback Script for TenantFlow
# This script handles database rollbacks from backups

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

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# List available backups
list_backups() {
    log "Available database backups:"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error "Backup directory not found: $BACKUP_DIR"
    fi
    
    local backups=($(ls -t "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | head -10))
    
    if [[ ${#backups[@]} -eq 0 ]]; then
        error "No database backups found in $BACKUP_DIR"
    fi
    
    for i in "${!backups[@]}"; do
        local backup="${backups[$i]}"
        local basename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)
        local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null || stat -c "%y" "$backup" 2>/dev/null | cut -d' ' -f1-2)
        
        echo "  $((i+1)). $basename ($size, $date)"
    done
}

# Restore database from backup
restore_database() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "Restoring database from: $(basename "$backup_file")"
    
    # Check if DATABASE_URL is set
    if [[ -z "${DATABASE_URL:-}" ]]; then
        error "DATABASE_URL environment variable is required"
    fi
    
    # Extract database connection details from DATABASE_URL
    if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        local user="${BASH_REMATCH[1]}"
        local password="${BASH_REMATCH[2]}"
        local host="${BASH_REMATCH[3]}"
        local port="${BASH_REMATCH[4]}"
        local dbname="${BASH_REMATCH[5]}"
        
        # Remove any query parameters from dbname
        dbname="${dbname%%\?*}"
        
        log "Connecting to database: $host:$port/$dbname"
        
        # Create a confirmation backup before rollback
        local confirmation_backup="$BACKUP_DIR/pre-rollback-$(date +%Y%m%d_%H%M%S).sql.gz"
        log "Creating confirmation backup before rollback..."
        
        PGPASSWORD="$password" pg_dump \
            -h "$host" \
            -p "$port" \
            -U "$user" \
            -d "$dbname" \
            --no-password \
            --clean \
            --if-exists | gzip > "$confirmation_backup"
        
        success "Confirmation backup created: $confirmation_backup"
        
        # Restore from backup
        log "Restoring database..."
        
        if [[ "$backup_file" == *.gz ]]; then
            gunzip -c "$backup_file" | PGPASSWORD="$password" psql \
                -h "$host" \
                -p "$port" \
                -U "$user" \
                -d "$dbname" \
                --no-password \
                -v ON_ERROR_STOP=1
        else
            PGPASSWORD="$password" psql \
                -h "$host" \
                -p "$port" \
                -U "$user" \
                -d "$dbname" \
                --no-password \
                -v ON_ERROR_STOP=1 \
                -f "$backup_file"
        fi
        
        success "Database restored successfully"
        
        # Regenerate Prisma client after restore
        log "Regenerating Prisma client..."
        cd "$PROJECT_ROOT/packages/database"
        npx prisma generate
        success "Prisma client regenerated"
        
    else
        error "Invalid DATABASE_URL format. Expected postgresql://user:pass@host:port/dbname"
    fi
}

# Interactive backup selection
select_backup() {
    local backups=($(ls -t "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | head -10))
    
    echo "Select a backup to restore:"
    read -r -p "Enter backup number (1-${#backups[@]}): " selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le ${#backups[@]} ]]; then
        local selected_backup="${backups[$((selection-1))]}"
        echo "Selected backup: $(basename "$selected_backup")"
        
        # Confirmation
        read -r -p "Are you sure you want to restore this backup? This will overwrite the current database! (yes/no): " confirm
        
        if [[ "$confirm" == "yes" ]]; then
            restore_database "$selected_backup"
        else
            log "Rollback cancelled by user"
        fi
    else
        error "Invalid selection: $selection"
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [BACKUP_FILE]"
    echo ""
    echo "Options:"
    echo "  --list, -l           List available backups"
    echo "  --interactive, -i    Interactive backup selection"
    echo "  --help, -h           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --list                                    # List available backups"
    echo "  $0 --interactive                             # Interactive backup selection"
    echo "  $0 /path/to/backup-20240101_120000.sql.gz   # Restore specific backup"
}

# Main execution
main() {
    local interactive=false
    local list_only=false
    local backup_file=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --list|-l)
                list_only=true
                shift
                ;;
            --interactive|-i)
                interactive=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            -*)
                error "Unknown option: $1"
                ;;
            *)
                backup_file="$1"
                shift
                ;;
        esac
    done
    
    # Execute based on arguments
    if [[ "$list_only" == true ]]; then
        list_backups
    elif [[ "$interactive" == true ]]; then
        list_backups
        echo ""
        select_backup
    elif [[ -n "$backup_file" ]]; then
        restore_database "$backup_file"
    else
        # Default to interactive mode
        list_backups
        echo ""
        select_backup
    fi
}

# Handle script interruption
trap 'error "Rollback interrupted by user"' INT TERM

# Check if running in production
if [[ "${NODE_ENV:-}" == "production" ]]; then
    warning "Running in PRODUCTION environment!"
    read -r -p "Are you absolutely sure you want to proceed with database rollback? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log "Rollback cancelled by user"
        exit 0
    fi
fi

# Execute main function
main "$@"