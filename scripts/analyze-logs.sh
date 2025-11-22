#!/bin/bash

# Script to extract warnings, errors, and important messages from log files
# Usage: ./scripts/analyze-logs.sh [log-file]

LOG_FILE="${1:-logs/backend-debug-*.log}"

echo "==========================================="
echo "Log Analysis Report"
echo "==========================================="
echo ""

# Function to analyze a single log file
analyze_log() {
    local file="$1"
    echo "Analyzing: $(basename "$file")"
    echo "File size: $(ls -lh "$file" | awk '{print $5}')"
    echo "-------------------------------------------"
    echo ""

    # Extract errors (case insensitive)
    echo "🔴 ERRORS:"
    grep -i -E "ERROR|FAIL|FATAL|Exception|Error:|Failed|Cannot|Could not|Unable to" "$file" | \
        grep -v "MODULE" | \
        grep -v "looking for" | \
        head -20

    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        echo "  No errors found"
    fi
    echo ""

    # Extract warnings
    echo "⚠️  WARNINGS:"
    grep -i -E "WARN|Warning|Deprecated" "$file" | \
        grep -v "MODULE" | \
        head -10

    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        echo "  No warnings found"
    fi
    echo ""

    # Extract initialization messages
    echo "🚀 INITIALIZATION:"
    grep -E "Creating|Starting|Listening|Bootstrap|Port configuration|NestFactory" "$file" | \
        grep -v "MODULE" | \
        tail -20
    echo ""

    # Extract timeout or hanging indicators
    echo "⏱️  TIMEOUT/HANGING INDICATORS:"
    tail -50 "$file" | grep -v "MODULE" | grep -v "looking for" | head -10
    echo ""

    # Check if process completed successfully
    echo "✅ COMPLETION STATUS:"
    if grep -q "Listening on" "$file"; then
        echo "  Server started successfully"
        grep "Listening on" "$file" | tail -1
    elif grep -q "SIGTERM\|SIGKILL\|timeout" "$file"; then
        echo "  Process was terminated/timed out"
        grep -E "SIGTERM|SIGKILL|timeout" "$file" | tail -1
    else
        echo "  Process did not complete startup"
    fi
    echo ""

    echo "==========================================="
    echo ""
}

# Check if specific file was provided
if [ -f "$1" ]; then
    analyze_log "$1"
else
    # Analyze all matching log files
    for log in $LOG_FILE; do
        if [ -f "$log" ]; then
            analyze_log "$log"
        fi
    done
fi

# Summary of common issues
echo "📊 SUMMARY OF COMMON ISSUES:"
echo ""

if ls logs/*.log 1> /dev/null 2>&1; then
    echo "Most recent errors across all logs:"
    grep -h -i "ERROR\|Exception\|Failed" logs/*.log 2>/dev/null | \
        grep -v "MODULE" | \
        tail -5

    echo ""
    echo "Startup hang location (from most recent log):"
    latest_log=$(ls -t logs/*.log | head -1)
    grep -A 2 "Creating NestFactory" "$latest_log" | tail -3
fi

echo ""
echo "💡 RECOMMENDATIONS:"
echo "1. If hanging at 'Creating NestFactory': Check module initialization"
echo "2. If SIGTERM/timeout: Increase timeout or check for blocking operations"
echo "3. If connection errors: Verify database/service connectivity"
echo "4. If port conflicts: Check for processes using the same port"