/**
 * CONSOLIDATED DOMAIN TYPES
 * 
 * Merged small domain-specific type files into single consolidated file
 * Reduces type file count while maintaining domain separation
 */

// =============================================================================
// CONTACT DOMAIN
// =============================================================================

export interface ContactFormRequest {
  name: string
  email: string
  subject: string
  message: string
  phone?: string
  company?: string
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface ContactFormResponse {
  success: boolean
  message: string
  contactId?: string
}

// =============================================================================
// STORAGE DOMAIN
// =============================================================================

export interface StorageUploadResult {
  url: string
  path: string
  filename: string
  size: number
  mimeType: string
  bucket: string
}

export interface FileUploadOptions {
  contentType?: string
  cacheControl?: string
  upsert?: boolean
}

export type StorageEntityType = 'property' | 'tenant' | 'maintenance' | 'user'
export type StorageFileType = 'document' | 'image' | 'avatar'

// =============================================================================
// BILLING & ANALYTICS DOMAIN
// =============================================================================

export interface RevenueAnalytics {
  period: string
  total_revenue: number
  subscription_revenue: number
  one_time_revenue: number
  customer_count: number
  new_customers: number
  churned_customers: number
  mrr: number
  arr: number
}

export interface ChurnAnalytics {
  month: string
  churned_subscriptions: number
  avg_lifetime_days: number
  churn_rate_percent: number
  total_active_start_month: number
}

export interface CustomerLifetimeValue {
  customer_id: string
  email: string
  total_revenue: number
  subscription_count: number
  first_subscription_date: string
  last_cancellation_date?: string
  avg_revenue_per_subscription: number
  status: 'Active' | 'Churned'
  lifetime_days?: number
}

// =============================================================================
// WEBSOCKET DOMAIN
// =============================================================================

export interface WebSocketMessage<T = Record<string, string | number | boolean | null>> {
  type: string
  data: T
  timestamp?: string
  userId?: string
}

export interface MaintenanceUpdateMessage extends WebSocketMessage<{
  id: string
  type: string
  status?: string
  priority?: string
  unitId?: string
  assignedTo?: string
  metadata?: Record<string, string | number | boolean | null>
}> {
  type: 'maintenance_update'
}

export type TypedWebSocketMessage = MaintenanceUpdateMessage | WebSocketMessage

// =============================================================================
// SESSION DOMAIN
// =============================================================================

export interface UserSession {
  id: string
  userId: string
  user?: Record<string, unknown> | null
  token: string
  isAuthenticated: boolean
  expiresAt: string
  lastActivity: Date | null
  sessionExpiry: Date | null
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface SessionConfig {
  maxAge: number
  secure: boolean
  httpOnly: boolean
  sameSite: 'strict' | 'lax' | 'none'
}

// =============================================================================
// USER MANAGEMENT DOMAIN  
// =============================================================================

export interface UserManagementConfig {
  maxLoginAttempts: number
  lockoutDuration: number
  passwordMinLength: number
  requireEmailVerification: boolean
}

export interface UserStats {
  totalUsers: number
  activeUsers: number
  newUsersThisMonth: number
  verifiedUsers: number
}

// =============================================================================
// THEME DOMAIN
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'system'

export type SemanticColorToken =
  | 'background'
  | 'foreground'
  | 'primary'
  | 'primary-foreground'
  | 'secondary'
  | 'secondary-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'muted'
  | 'muted-foreground'
  | 'success'
  | 'success-foreground'
  | 'warning'
  | 'warning-foreground'
  | 'error'
  | 'error-foreground'
  | 'info'
  | 'info-foreground'
  | 'border'
  | 'ring'
  | 'input'
  | 'card'
  | 'card-foreground'

export interface ColorRationale {
  primary: string
  secondary: string
  background: string
  reasoning: string
}

// =============================================================================
// WEBHOOK DOMAIN
// =============================================================================

export type StripeWebhookEventType = 
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'

export interface StripeWebhookEvent {
  id: string
  type: StripeWebhookEventType
  data: {
    object: Record<string, unknown>
  }
  created: number
}

export interface WebhookNotification {
  id: string
  event: string
  status: 'pending' | 'processed' | 'failed'
  payload: Record<string, unknown>
  createdAt: string
  processedAt?: string
  error?: string
}

export type WebhookProcessorFunction = (event: StripeWebhookEvent) => Promise<void>

export interface StripeWebhookProcessor {
  [key: string]: WebhookProcessorFunction
}