#!/bin/bash

# Test CI workflows locally with act
# This script helps test GitHub Actions locally without needing to push commits

echo "🔧 Testing CI workflows locally with act..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo -e "${RED}❌ act is not installed${NC}"
    echo "Install it with: brew install act"
    exit 1
fi

# Function to run a specific workflow
run_workflow() {
    local workflow=$1
    local job=$2
    local description=$3
    
    echo -e "${YELLOW}Running: $description${NC}"
    
    # Use --artifact-server-path to handle artifacts locally
    # Use -P to specify platform if needed
    # Use --container-architecture to match your system
    if [ -n "$job" ]; then
        act -W ".github/workflows/$workflow" -j "$job" \
            --artifact-server-path /tmp/artifacts \
            --container-architecture linux/amd64 \
            --rm
    else
        act -W ".github/workflows/$workflow" \
            --artifact-server-path /tmp/artifacts \
            --container-architecture linux/amd64 \
            --rm
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $description passed${NC}"
    else
        echo -e "${RED}❌ $description failed${NC}"
        return 1
    fi
    echo ""
}

# Menu for selecting what to test
echo "Select what to test:"
echo "1) Quick Validation (fastest)"
echo "2) Full CI Pipeline"
echo "3) Fast Feedback"
echo "4) Specific workflow file"
echo "5) List all available workflows"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        run_workflow "ci.yml" "quick-validation" "Quick Validation"
        ;;
    2)
        run_workflow "ci.yml" "" "Full CI Pipeline"
        ;;
    3)
        run_workflow "fast-feedback.yml" "" "Fast Feedback"
        ;;
    4)
        echo "Available workflow files:"
        ls -1 .github/workflows/*.yml | xargs -n 1 basename
        echo ""
        read -p "Enter workflow filename (without path): " workflow
        if [ -f ".github/workflows/$workflow" ]; then
            run_workflow "$workflow" "" "Custom workflow: $workflow"
        else
            echo -e "${RED}Workflow file not found${NC}"
            exit 1
        fi
        ;;
    5)
        echo "Available workflows and jobs:"
        echo ""
        for workflow in .github/workflows/*.yml; do
            echo "📄 $(basename $workflow)"
            # Extract job names
            grep -E "^  [a-z-]+:" "$workflow" | sed 's/://g' | sed 's/^/    - /'
            echo ""
        done
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Testing complete!${NC}"