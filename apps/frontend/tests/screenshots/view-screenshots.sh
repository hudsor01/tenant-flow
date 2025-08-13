#!/bin/bash

# Script to view signup form screenshots
echo "📸 Opening TenantFlow Signup Screenshots..."

SCREENSHOT_DIR="/Users/richard/Developer/tenant-flow/apps/frontend/tests/screenshots"

# Check if directory exists
if [ ! -d "$SCREENSHOT_DIR" ]; then
    echo "❌ Screenshots directory not found: $SCREENSHOT_DIR"
    exit 1
fi

cd "$SCREENSHOT_DIR"

echo "🔍 Available screenshots:"
echo ""

# List all PNG files with descriptions
if [ -f "signup-01-initial-form.png" ]; then
    echo "✅ signup-01-initial-form.png - Initial signup form (RECOMMENDED)"
fi

if [ -f "signup-02-filled-form.png" ]; then
    echo "✅ signup-02-filled-form.png - Filled signup form (RECOMMENDED)"
fi

if [ -f "signup-03-post-submit.png" ]; then
    echo "✅ signup-03-post-submit.png - Email confirmation view (RECOMMENDED)"
fi

if [ -f "signup-05-final-state.png" ]; then
    echo "✅ signup-05-final-state.png - Final diagnostic view"
fi

if [ -f "signup-06-structure-analysis.png" ]; then
    echo "✅ signup-06-structure-analysis.png - Structure analysis"
fi

echo ""
echo "🎯 Opening recommended screenshots in order:"

# Open the three main screenshots
if command -v open &> /dev/null; then
    # macOS
    echo "📱 Opening with Preview..."
    open "signup-01-initial-form.png" &
    sleep 1
    open "signup-02-filled-form.png" &
    sleep 1
    open "signup-03-post-submit.png" &
elif command -v xdg-open &> /dev/null; then
    # Linux
    echo "📱 Opening with default image viewer..."
    xdg-open "signup-01-initial-form.png" &
    sleep 1
    xdg-open "signup-02-filled-form.png" &
    sleep 1
    xdg-open "signup-03-post-submit.png" &
else
    echo "🔧 Please manually open the PNG files in this directory:"
    echo "$SCREENSHOT_DIR"
fi

echo ""
echo "📁 Full directory path: $SCREENSHOT_DIR"
echo "✨ Screenshots show the enhanced email confirmation design with:"
echo "   - Personalized email display"
echo "   - Resend button functionality" 
echo "   - Visual elements and icons"
echo "   - Clean, modern form design"

# Optionally open the directory
if command -v open &> /dev/null; then
    echo ""
    read -p "🗂️  Open screenshots folder in Finder? (y/N): " open_folder
    if [[ $open_folder =~ ^[Yy]$ ]]; then
        open "$SCREENSHOT_DIR"
    fi
fi