#!/bin/bash
# Check for local env files that might override Doppler
# This prevents accidentally connecting to local Supabase instead of remote

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_local_env() {
    local file=$1
    if [ -f "$file" ]; then
        if grep -q "localhost:54321\|127.0.0.1:54321" "$file" 2>/dev/null; then
            echo -e "${RED}⚠️  WARNING: $file contains local Supabase URL${NC}"
            echo -e "${YELLOW}   This will override Doppler and connect to local database.${NC}"
            echo -e "${YELLOW}   Delete this file to use remote Supabase: rm $file${NC}"
            return 1
        fi
    fi
    return 0
}

errors=0

check_local_env "apps/frontend/.env.local" || ((errors++))
check_local_env "apps/backend/.env.local" || ((errors++))

if [ $errors -gt 0 ]; then
    echo ""
    echo -e "${RED}Found $errors local env file(s) that may cause database connection issues.${NC}"
    exit 1
fi

echo "✅ No local env overrides detected - using Doppler configuration"
