// Proper TypeScript types for subscription API responses
// These match the backend JSON API response structure

export interface CreateSubscriptionResponse {
  subscriptionId: string
  status: string
  clientSecret?: string | null
  setupIntentId?: string
  trialEnd?: number | null
}

export interface CreateSubscriptionWithSignupResponse {
  subscriptionId: string
  status: string
  clientSecret?: string | null
  setupIntentId?: string
  trialEnd?: number | null
  user: {
    id: string
    email: string
    fullName: string
  }
  accessToken: string
  refreshToken: string
}

export interface StartTrialResponse {
  subscriptionId: string
  status: string
  trialEnd?: number | null
}

export interface CreatePortalSessionResponse {
  url: string
  sessionId?: string
}

export interface CancelSubscriptionResponse {
  success: boolean
  message: string
}

export interface UpdateSubscriptionResponse {
  subscriptionId: string
  status: string
  message: string
}

// Generic API response wrapper (JSON API format)
export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    code: string
    message: string
    details?: object
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

// Subscription request types
export interface CreateSubscriptionRequest {
  planId: string
  billingPeriod: string
  userId?: string
  userEmail?: string
  userName?: string
  createAccount?: boolean
  paymentMethodCollection?: 'always' | 'if_required'
}

export interface CreateSubscriptionWithSignupRequest {
  planId: string
  billingPeriod: string
  userEmail: string
  userName: string
  createAccount: boolean
  paymentMethodCollection?: 'always' | 'if_required'
}

export interface StartTrialRequest {
  planId?: string  // Optional plan ID if trial is plan-specific
}

export interface CreatePortalSessionRequest {
  customerId?: string
  returnUrl?: string
}

export interface CancelSubscriptionRequest {
  subscriptionId: string
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string
  planId?: string
  billingPeriod?: string
}