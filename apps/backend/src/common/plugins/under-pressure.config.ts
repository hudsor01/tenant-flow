/**
 * @fastify/under-pressure Configuration
 * 
 * This plugin monitors server health and automatically responds with 503 Service Unavailable
 * when the server is under heavy load, protecting it from cascading failures.
 * 
 * What it monitors:
 * - Event loop delay (JavaScript execution blocking)
 * - Event loop utilization (percentage of time spent working)
 * - Heap memory usage (V8 heap percentage)
 * - RSS memory usage (total process memory)
 * 
 * When thresholds are exceeded:
 * 1. New requests get 503 with Retry-After header
 * 2. Existing requests continue processing
 * 3. Health check endpoint can report unhealthy
 * 4. Metrics are logged for monitoring
 * 
 * Benefits:
 * - Prevents server crash from overload
 * - Maintains service availability for some users
 * - Allows auto-scaling triggers in orchestrators
 * - Provides graceful degradation under load
 * 
 * Current thresholds (configured in main.ts):
 * - Max event loop delay: 1000ms
 * - Max event loop utilization: 98%
 * - Max heap usage: 98%
 * - Max RSS usage: 98%
 * - Retry-After: 60 seconds
 * 
 * To test locally:
 * 1. Run: npm run dev
 * 2. Generate load: npx autocannon -c 100 -d 30 http://localhost:3001/api/v1/properties
 * 3. Watch for 503 responses when thresholds exceeded
 */

export interface UnderPressureConfig {
  maxEventLoopDelay: number
  maxEventLoopUtilization: number
  maxHeapUsedBytes: number
  maxRssBytes: number
  retryAfter: number
  healthCheckInterval: number
}

export const PRODUCTION_CONFIG: UnderPressureConfig = {
  maxEventLoopDelay: 1000,        // 1 second
  maxEventLoopUtilization: 0.98,  // 98%
  maxHeapUsedBytes: 0.98,         // 98% of heap
  maxRssBytes: 0.98,               // 98% of RSS
  retryAfter: 60,                  // 60 seconds
  healthCheckInterval: 5000        // Check every 5 seconds
}

export const DEVELOPMENT_CONFIG: UnderPressureConfig = {
  maxEventLoopDelay: 2000,        // More lenient in dev
  maxEventLoopUtilization: 0.99,  // 99%
  maxHeapUsedBytes: 0.99,         // 99% of heap
  maxRssBytes: 0.99,               // 99% of RSS
  retryAfter: 30,                  // 30 seconds
  healthCheckInterval: 10000       // Check every 10 seconds
}