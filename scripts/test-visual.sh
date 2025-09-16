#!/bin/bash

# Visual Testing Suite - Ultra-Granular Execution
# Run specific test categories for debugging and iteration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[VISUAL TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Help function
show_help() {
    echo "Visual Testing Suite - Ultra-Granular Execution"
    echo ""
    echo "Usage: $0 [CATEGORY] [OPTIONS]"
    echo ""
    echo "CATEGORIES:"
    echo "  buttons       - Test button states and micro-interactions"
    echo "  glassmorphism - Test Apple glassmorphism quality"
    echo "  navbar        - Test navbar sticky routing and behavior"
    echo "  pages         - Test page-specific polish (homepage, features)"
    echo "  dark-mode     - Test dark mode perfection"
    echo "  interactions  - Test micro-interactions quality"
    echo "  all           - Run all visual tests"
    echo ""
    echo "PAGE-SPECIFIC TESTS:"
    echo "  homepage      - Test homepage polish only"
    echo "  features      - Test features page polish only"
    echo "  pricing       - Test pricing page polish only"
    echo ""
    echo "COMPONENT-SPECIFIC TESTS:"
    echo "  btn-primary   - Test primary button states only"
    echo "  btn-outline   - Test outline button quality only"
    echo "  cards         - Test card interactions only"
    echo "  nav-sticky    - Test navbar sticky behavior only"
    echo ""
    echo "OPTIONS:"
    echo "  --headed      - Run tests in headed mode (visible browser)"
    echo "  --debug       - Run with debug output"
    echo "  --update      - Update screenshots (use with caution)"
    echo "  --mobile      - Run mobile-specific tests only"
    echo "  --desktop     - Run desktop-specific tests only"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 buttons --headed         # Test buttons with visible browser"
    echo "  $0 glassmorphism --debug    # Test glassmorphism with debug output"
    echo "  $0 btn-primary --update     # Update primary button screenshots"
    echo "  $0 navbar --mobile          # Test navbar on mobile only"
    echo "  $0 all --headed --debug     # Run all tests with full visibility"
    echo ""
}

# Parse command line arguments
CATEGORY=""
HEADED=""
DEBUG=""
UPDATE=""
MOBILE=""
DESKTOP=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADED="--headed"
            shift
            ;;
        --debug)
            DEBUG="--debug"
            shift
            ;;
        --update)
            UPDATE="--update-snapshots"
            shift
            ;;
        --mobile)
            MOBILE="--grep mobile"
            shift
            ;;
        --desktop)
            DESKTOP="--grep -v mobile"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            if [[ -z "$CATEGORY" ]]; then
                CATEGORY="$1"
            else
                print_error "Unknown option: $1"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Default to showing help if no category provided
if [[ -z "$CATEGORY" ]]; then
    show_help
    exit 0
fi

# Build playwright command with options
PLAYWRIGHT_CMD="npx playwright test"
if [[ -n "$HEADED" ]]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $HEADED"
fi
if [[ -n "$DEBUG" ]]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
fi
if [[ -n "$UPDATE" ]]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $UPDATE"
fi
if [[ -n "$MOBILE" ]]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $MOBILE"
fi
if [[ -n "$DESKTOP" ]]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $DESKTOP"
fi

# Function to run tests with status updates
run_test() {
    local test_file="$1"
    local test_name="$2"

    print_status "Running $test_name tests..."

    if [[ -f "$test_file" ]]; then
        if $PLAYWRIGHT_CMD "$test_file"; then
            print_success "$test_name tests completed successfully"
        else
            print_error "$test_name tests failed"
            return 1
        fi
    else
        print_error "Test file not found: $test_file"
        return 1
    fi
}

# Execute based on category
case $CATEGORY in
    "buttons")
        print_status "Running button quality tests..."
        run_test "tests/visual/components/buttons/btn-primary-states.spec.ts" "Primary Button States"
        run_test "tests/visual/components/buttons/btn-outline-polish.spec.ts" "Outline Button Polish"
        ;;

    "glassmorphism")
        print_status "Running Apple glassmorphism tests..."
        run_test "tests/visual/glassmorphism/backdrop-blur-quality.spec.ts" "Glassmorphism Quality"
        ;;

    "navbar")
        print_status "Running navbar tests..."
        run_test "tests/visual/navigation/navbar-sticky-routing.spec.ts" "Navbar Sticky Routing"
        ;;

    "pages")
        print_status "Running page polish tests..."
        run_test "tests/visual/pages/homepage-polish.spec.ts" "Homepage Polish"
        run_test "tests/visual/pages/features-polish.spec.ts" "Features Polish"
        ;;

    "dark-mode")
        print_status "Running dark mode perfection tests..."
        run_test "tests/visual/themes/dark-mode-perfection.spec.ts" "Dark Mode Perfection"
        ;;

    "interactions")
        print_status "Running micro-interactions tests..."
        run_test "tests/visual/interactions/micro-interactions.spec.ts" "Micro-Interactions"
        ;;

    "homepage")
        run_test "tests/visual/pages/homepage-polish.spec.ts" "Homepage Polish"
        ;;

    "features")
        run_test "tests/visual/pages/features-polish.spec.ts" "Features Polish"
        ;;

    "btn-primary")
        run_test "tests/visual/components/buttons/btn-primary-states.spec.ts" "Primary Button States"
        ;;

    "btn-outline")
        run_test "tests/visual/components/buttons/btn-outline-polish.spec.ts" "Outline Button Polish"
        ;;

    "nav-sticky")
        run_test "tests/visual/navigation/navbar-sticky-routing.spec.ts" "Navbar Sticky Routing"
        ;;

    "all")
        print_status "Running complete visual test suite..."

        # Run in logical order
        run_test "tests/visual/components/buttons/btn-primary-states.spec.ts" "Primary Button States"
        run_test "tests/visual/components/buttons/btn-outline-polish.spec.ts" "Outline Button Polish"
        run_test "tests/visual/glassmorphism/backdrop-blur-quality.spec.ts" "Glassmorphism Quality"
        run_test "tests/visual/navigation/navbar-sticky-routing.spec.ts" "Navbar Sticky Routing"
        run_test "tests/visual/pages/homepage-polish.spec.ts" "Homepage Polish"
        run_test "tests/visual/pages/features-polish.spec.ts" "Features Polish"
        run_test "tests/visual/themes/dark-mode-perfection.spec.ts" "Dark Mode Perfection"
        run_test "tests/visual/interactions/micro-interactions.spec.ts" "Micro-Interactions"

        print_success "Complete visual test suite finished!"
        ;;

    *)
        print_error "Unknown category: $CATEGORY"
        echo ""
        show_help
        exit 1
        ;;
esac

print_success "Visual testing completed for category: $CATEGORY"
print_status "Screenshots and reports available in test-results/"