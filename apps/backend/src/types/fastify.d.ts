/**
 * Fastify type augmentations for the backend application
 * 
 * This file extends Fastify's built-in types to add custom properties
 * that are used throughout the backend for request tracking and context.
 */

import { RequestContext } from '@repo/shared'

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Request lifecycle context including tracking ID, tenant info, and timing
     * Set by FastifyHooksService during onRequest hook
     */
    context: RequestContext
    
    /**
     * Convenience property for quick tenant ID access
     * Populated from context.tenantId for easier access in controllers/services
     */
    tenantId?: string
  }
}