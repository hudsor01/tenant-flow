#!/bin/bash

echo "===================================="
echo "Railway Health Check Simulation"
echo "===================================="
echo ""
echo "Configuration:"
echo "  Path: /ping"
echo "  Retry window: 30s"
echo "  Max attempts: 3"
echo ""
echo "Starting Healthcheck..."
echo "===================="
echo ""

SUCCESS=false
ATTEMPT=1
MAX_ATTEMPTS=3
RETRY_WINDOW=30
START_TIME=$(date +%s)

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "Attempt #$ATTEMPT..."
    
    # Simulate Railway's health check with 3 second timeout
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3002/ping)
    
    if [ "$RESPONSE" = "200" ]; then
        echo "  ✅ SUCCESS - Status: 200 OK"
        SUCCESS=true
        break
    else
        CURRENT_TIME=$(date +%s)
        ELAPSED=$((CURRENT_TIME - START_TIME))
        REMAINING=$((RETRY_WINDOW - ELAPSED))
        
        if [ "$RESPONSE" = "000" ]; then
            echo "  ❌ FAILED - Service unavailable (timeout/connection refused)"
        else
            echo "  ❌ FAILED - Status: $RESPONSE"
        fi
        
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ $REMAINING -gt 0 ]; then
            echo "  Continuing to retry for ${REMAINING}s..."
            sleep 2
        fi
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "===================="
if [ "$SUCCESS" = true ]; then
    echo "✅ Healthcheck PASSED!"
    echo "Railway deployment would succeed"
else
    echo "❌ Healthcheck FAILED!"
    echo "1/1 replicas never became healthy!"
    echo "Railway deployment would fail"
fi
echo "===================================="