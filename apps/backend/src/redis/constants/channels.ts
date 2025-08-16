/**
 * Standardized channel names and patterns for Redis Pub/Sub
 */

export const CHANNEL_PREFIXES = {
  NOTIFICATIONS: 'notifications',
  PROPERTY: 'property',
  MAINTENANCE: 'maintenance',
  SYSTEM: 'system',
  EMAIL: 'email',
  PAYMENT: 'payment',
  SUBSCRIPTION: 'subscription',
  CHAT: 'chat',
  BROADCAST: 'broadcast'
} as const

export const CHANNELS = {
  // User-specific notifications
  USER_NOTIFICATIONS: (userId: string) => `${CHANNEL_PREFIXES.NOTIFICATIONS}:user:${userId}`,
  
  // Organization-wide notifications
  ORG_NOTIFICATIONS: (orgId: string) => `${CHANNEL_PREFIXES.NOTIFICATIONS}:org:${orgId}`,
  
  // Property-specific updates
  PROPERTY_UPDATES: (propertyId: string) => `${CHANNEL_PREFIXES.PROPERTY}:updates:${propertyId}`,
  
  // Maintenance request updates
  MAINTENANCE_UPDATES: (propertyId: string) => `${CHANNEL_PREFIXES.MAINTENANCE}:updates:${propertyId}`,
  MAINTENANCE_STATUS: (requestId: string) => `${CHANNEL_PREFIXES.MAINTENANCE}:status:${requestId}`,
  
  // System-wide events
  SYSTEM_EVENTS: `${CHANNEL_PREFIXES.SYSTEM}:events`,
  SYSTEM_HEALTH: `${CHANNEL_PREFIXES.SYSTEM}:health`,
  SYSTEM_METRICS: `${CHANNEL_PREFIXES.SYSTEM}:metrics`,
  
  // Email processing events
  EMAIL_EVENTS: `${CHANNEL_PREFIXES.EMAIL}:events`,
  EMAIL_STATUS: (jobId: string) => `${CHANNEL_PREFIXES.EMAIL}:status:${jobId}`,
  
  // Payment processing events
  PAYMENT_EVENTS: `${CHANNEL_PREFIXES.PAYMENT}:events`,
  PAYMENT_STATUS: (paymentId: string) => `${CHANNEL_PREFIXES.PAYMENT}:status:${paymentId}`,
  
  // Subscription events
  SUBSCRIPTION_EVENTS: `${CHANNEL_PREFIXES.SUBSCRIPTION}:events`,
  SUBSCRIPTION_UPDATES: (userId: string) => `${CHANNEL_PREFIXES.SUBSCRIPTION}:updates:${userId}`,
  
  // Real-time chat
  CHAT_ROOM: (roomId: string) => `${CHANNEL_PREFIXES.CHAT}:room:${roomId}`,
  CHAT_DIRECT: (userId1: string, userId2: string) => {
    // Sort user IDs to ensure consistent channel name regardless of order
    const sorted = [userId1, userId2].sort()
    return `${CHANNEL_PREFIXES.CHAT}:direct:${sorted[0]}:${sorted[1]}`
  },
  
  // Broadcast channels
  BROADCAST_ALL: `${CHANNEL_PREFIXES.BROADCAST}:all`,
  BROADCAST_ADMINS: `${CHANNEL_PREFIXES.BROADCAST}:admins`
} as const

// Pattern-based subscriptions for monitoring
export const CHANNEL_PATTERNS = {
  ALL_USER_NOTIFICATIONS: `${CHANNEL_PREFIXES.NOTIFICATIONS}:user:*`,
  ALL_ORG_NOTIFICATIONS: `${CHANNEL_PREFIXES.NOTIFICATIONS}:org:*`,
  ALL_PROPERTY_UPDATES: `${CHANNEL_PREFIXES.PROPERTY}:updates:*`,
  ALL_MAINTENANCE_UPDATES: `${CHANNEL_PREFIXES.MAINTENANCE}:*`,
  ALL_SYSTEM_EVENTS: `${CHANNEL_PREFIXES.SYSTEM}:*`,
  ALL_EMAIL_EVENTS: `${CHANNEL_PREFIXES.EMAIL}:*`,
  ALL_PAYMENT_EVENTS: `${CHANNEL_PREFIXES.PAYMENT}:*`,
  ALL_SUBSCRIPTION_EVENTS: `${CHANNEL_PREFIXES.SUBSCRIPTION}:*`,
  ALL_CHAT_MESSAGES: `${CHANNEL_PREFIXES.CHAT}:*`,
  ALL_BROADCASTS: `${CHANNEL_PREFIXES.BROADCAST}:*`
} as const

// Helper function to extract IDs from channel names
export function extractIdFromChannel(channel: string, prefix: string): string | null {
  const pattern = new RegExp(`^${prefix}:(.+)$`)
  const match = channel.match(pattern)
  return match?.[1] ?? null
}

// Helper function to validate channel name format
export function isValidChannel(channel: string): boolean {
  const validPrefixes = Object.values(CHANNEL_PREFIXES)
  return validPrefixes.some(prefix => channel.startsWith(prefix + ':'))
}

// Helper function to get channel type
export function getChannelType(channel: string): string | null {
  const validPrefixes = Object.values(CHANNEL_PREFIXES)
  for (const prefix of validPrefixes) {
    if (channel.startsWith(prefix + ':')) {
      return prefix
    }
  }
  return null
}
