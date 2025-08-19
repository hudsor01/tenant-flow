#!/bin/bash

# This simulates EXACTLY what Railway does based on their docs

echo "=== Simulating Railway Health Check ==="
echo "Railway health checks from INSIDE the container network"
echo ""

# Railway provides PORT dynamically
export PORT=${PORT:-$(shuf -i 3000-9000 -n 1)}
echo "Railway assigns random PORT: $PORT"

# Start your app as Railway would
echo "Starting app with Railway's command..."
NODE_ENV=production PORT=$PORT timeout 10 npm run start &
APP_PID=$!

echo "Waiting 5 seconds for app to start..."
sleep 5

# Railway health check from INSIDE container (using 0.0.0.0 not localhost)
echo ""
echo "Railway health check attempt 1 (0.0.0.0:$PORT/ping):"
curl -f -s -w "\nStatus: %{http_code}, Time: %{time_total}s\n" \
  --max-time 30 \
  http://0.0.0.0:$PORT/ping || echo "FAILED"

echo ""
echo "Railway health check attempt 2 (127.0.0.1:$PORT/ping):"
curl -f -s -w "\nStatus: %{http_code}, Time: %{time_total}s\n" \
  --max-time 30 \
  http://127.0.0.1:$PORT/ping || echo "FAILED"

echo ""
echo "Railway health check attempt 3 (localhost:$PORT/ping):"
curl -f -s -w "\nStatus: %{http_code}, Time: %{time_total}s\n" \
  --max-time 30 \
  http://localhost:$PORT/ping || echo "FAILED"

# Clean up
kill $APP_PID 2>/dev/null

echo ""
echo "=== Key Points ==="
echo "1. Railway uses dynamic PORT (not 4600)"
echo "2. Health check runs from INSIDE container"
echo "3. App must bind to 0.0.0.0, not just localhost"
echo "4. Check must return 200 within 30 seconds"