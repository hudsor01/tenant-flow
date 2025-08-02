import { Injectable, NestMiddleware } from '@nestjs/common'
import { randomUUID } from 'crypto'

/**
 * Correlation ID middleware for request tracing across services
 * Adds unique correlation ID to each request for debugging and audit trails
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: any) {
    // Check if correlation ID already exists (from upstream services)
    let correlationId = req.headers['x-correlation-id'] as string
    
    // Generate new correlation ID if not present
    if (!correlationId) {
      correlationId = randomUUID()
    }
    
    // Validate correlation ID format (must be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(correlationId)) {
      correlationId = randomUUID()
    }
    
    // Add to request headers for downstream processing
    req.headers['x-correlation-id'] = correlationId
    
    // Add to response headers for client tracking
    res.setHeader('X-Correlation-ID', correlationId)
    
    // Attach to request object for easy access in controllers/services
    req.correlationId = correlationId
    
    next()
  }
}