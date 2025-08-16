import { z } from 'zod'

export interface PubSubMessage {
  id: string
  type: string
  payload: unknown
  timestamp: Date
  correlationId?: string
  metadata?: Record<string, unknown>
}

export interface NotificationMessage extends PubSubMessage {
  recipientId: string
  recipientType: 'user' | 'organization' | 'property' | 'group'
  priority: 'HIGH' | 'NORMAL' | 'LOW'
  category: string
  title: string
  content: string
  actions?: {
    label: string
    action: string
    url?: string
  }[]
}

export interface SystemEventMessage extends PubSubMessage {
  eventType: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  source: string
  details?: Record<string, unknown>
}

export enum ChannelPatterns {
  USER_NOTIFICATIONS = 'notifications:user:',
  ORG_NOTIFICATIONS = 'notifications:org:',
  PROPERTY_UPDATES = 'property:updates:',
  MAINTENANCE_UPDATES = 'maintenance:updates:',
  SYSTEM_EVENTS = 'system:events',
  EMAIL_EVENTS = 'email:events',
  PAYMENT_EVENTS = 'payment:events',
  SUBSCRIPTION_EVENTS = 'subscription:events'
}

export enum MessagePriority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW'
}

// Zod schemas for validation
export const PubSubMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  payload: z.unknown(),
  timestamp: z.instanceof(Date),
  correlationId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export const NotificationMessageSchema = PubSubMessageSchema.extend({
  recipientId: z.string().min(1),
  recipientType: z.enum(['user', 'organization', 'property', 'group']),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']),
  category: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  actions: z.array(z.object({
    label: z.string().min(1),
    action: z.string().min(1),
    url: z.string().url().optional()
  })).optional()
})

export const SystemEventMessageSchema = PubSubMessageSchema.extend({
  eventType: z.string().min(1),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']),
  source: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional()
})

export interface PubSubStats {
  totalMessagesPublished: number
  totalMessagesReceived: number
  activeSubscriptions: number
  channels: string[]
  errors: number
  lastError?: string
  uptime: number
}
