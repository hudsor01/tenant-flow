/**
 * Fastify Request Type Extensions
 * 
 * Extends the base FastifyRequest interface with custom properties
 * used throughout the application for logging and request tracking.
 */

import type { FastifyRequest as BaseFastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Unique correlation ID for request tracking across services
     */
    correlationId?: string

    /**
     * Request start timestamp for performance tracking
     */
    startTime?: number
  }
}

// Re-export the augmented FastifyRequest type for use throughout the app
export type ExtendedFastifyRequest = BaseFastifyRequest & {
  correlationId: string
  startTime: number
}