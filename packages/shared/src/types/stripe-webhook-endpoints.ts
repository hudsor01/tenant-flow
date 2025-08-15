/**
 * Stripe Webhook Endpoint Type Definitions for TenantFlow
 * 
 * Type definitions for webhook endpoints configuration and management
 * based on official Stripe API documentation.
 */

import type { StripeMetadata } from './stripe'

// ========================
// Webhook Endpoint Types
// ========================

export const WEBHOOK_ENDPOINT_STATUSES = {
  ENABLED: 'enabled',
  DISABLED: 'disabled'
} as const

export type WebhookEndpointStatus = typeof WEBHOOK_ENDPOINT_STATUSES[keyof typeof WEBHOOK_ENDPOINT_STATUSES]

/**
 * Main Webhook Endpoint object
 */
export interface StripeWebhookEndpoint {
  readonly id: string
  readonly object: 'webhook_endpoint'
  readonly api_version?: string | null
  readonly application?: string | null
  readonly created: number
  readonly description?: string | null
  readonly enabled_events: string[]
  readonly livemode: boolean
  readonly metadata: StripeMetadata
  readonly secret?: string | null
  readonly status: WebhookEndpointStatus
  readonly url: string
}

/**
 * Webhook Endpoint creation parameters
 */
export interface WebhookEndpointCreateParams {
  readonly url: string
  readonly enabled_events: string[]
  readonly api_version?: string
  readonly connect?: boolean
  readonly description?: string
  readonly metadata?: StripeMetadata
}

/**
 * Webhook Endpoint update parameters
 */
export interface WebhookEndpointUpdateParams {
  readonly description?: string
  readonly disabled?: boolean
  readonly enabled_events?: string[]
  readonly metadata?: StripeMetadata
  readonly url?: string
}

// ========================
// Utility Functions
// ========================

/**
 * Type guard for Webhook Endpoint objects
 */
export function isStripeWebhookEndpoint(obj: unknown): obj is StripeWebhookEndpoint {
  return obj !== null && typeof obj === 'object' && 
         'object' in obj && obj.object === 'webhook_endpoint' && 
         'id' in obj && typeof obj.id === 'string'
}

/**
 * Check if webhook endpoint is enabled
 */
export function isWebhookEndpointEnabled(endpoint: StripeWebhookEndpoint): boolean {
  return endpoint.status === 'enabled'
}

/**
 * Check if webhook endpoint handles specific event type
 */
export function handlesEventType(endpoint: StripeWebhookEndpoint, eventType: string): boolean {
  return endpoint.enabled_events.includes(eventType) || endpoint.enabled_events.includes('*')
}

/**
 * Get webhook endpoint event count
 */
export function getEventCount(endpoint: StripeWebhookEndpoint): number {
  return endpoint.enabled_events.length
}

/**
 * Check if webhook endpoint handles all events
 */
export function handlesAllEvents(endpoint: StripeWebhookEndpoint): boolean {
  return endpoint.enabled_events.includes('*')
}

/**
 * Get webhook endpoint environment
 */
export function getWebhookEnvironment(endpoint: StripeWebhookEndpoint): 'test' | 'live' {
  return endpoint.livemode ? 'live' : 'test'
}

/**
 * Extract TenantFlow-specific metadata
 */
export function extractTenantFlowWebhookMetadata(endpoint: StripeWebhookEndpoint): {
  organizationId?: string
  environment?: string
  purpose?: string
  version?: string
} {
  const metadata = endpoint.metadata || {}
  
  return {
    organizationId: metadata.tenantflow_organization_id || metadata.organization_id,
    environment: metadata.tenantflow_environment || metadata.environment,
    purpose: metadata.tenantflow_purpose || metadata.purpose,
    version: metadata.tenantflow_version || metadata.version
  }
}