/**
 * Test and Documentation for tRPC Subscription Endpoints
 * 
 * This file demonstrates how to use the comprehensive subscription endpoints
 * and shows integration with the Stripe MCP server.
 */

// import { PlanType } from '@prisma/client'

// Mock user context for testing
// const mockUserContext = {
//   user: {
//     id: 'test-user-123',
//     email: 'test@example.com',
//     name: 'Test User'
//   }
// }

/**
 * TRPC SUBSCRIPTION ENDPOINTS DOCUMENTATION
 * 
 * The following endpoints are available in the subscription router:
 */

export const subscriptionEndpointsDocumentation = {
  /**
   * 1. GET CURRENT SUBSCRIPTION
   * 
   * Endpoint: subscriptions.getCurrent
   * Type: Query (protectedProcedure)
   * Input: None (uses user context)
   * Output: SubscriptionWithPlan
   */
  getCurrent: {
    description: 'Get current user subscription with plan details and usage metrics',
    example: `
    const subscription = await trpc.subscriptions.getCurrent.query()
    // Returns: { id, userId, plan, status, usage, limits, etc. }
    `,
    errorCodes: ['INTERNAL_SERVER_ERROR'],
  },

  /**
   * 2. GET USAGE METRICS
   * 
   * Endpoint: subscriptions.getUsage
   * Type: Query (protectedProcedure)
   * Input: None (uses user context)
   * Output: UsageMetrics
   */
  getUsage: {
    description: 'Get user current usage across all metrics',
    example: `
    const usage = await trpc.subscriptions.getUsage.query()
    // Returns: { properties: 5, tenants: 12, storage: 150, leaseGeneration: 3 }
    `,
    errorCodes: ['INTERNAL_SERVER_ERROR'],
  },

  /**
   * 3. GET AVAILABLE PLANS
   * 
   * Endpoint: subscriptions.getPlans
   * Type: Query (publicProcedure)
   * Input: None
   * Output: PlanDetails[]
   */
  getPlans: {
    description: 'Get all available subscription plans',
    example: `
    const plans = await trpc.subscriptions.getPlans.query()
    // Returns array of plans with pricing, limits, and features
    `,
    errorCodes: ['INTERNAL_SERVER_ERROR'],
  },

  /**
   * 4. GET SPECIFIC PLAN
   * 
   * Endpoint: subscriptions.getPlan
   * Type: Query (publicProcedure)
   * Input: { planId: string }
   * Output: PlanDetails | null
   */
  getPlan: {
    description: 'Get details for a specific plan',
    example: `
    const plan = await trpc.subscriptions.getPlan.query({ planId: '' })
    // Returns plan details or null if not found
    `,
    errorCodes: ['INTERNAL_SERVER_ERROR'],
  },

  /**
   * 5. CREATE SUBSCRIPTION
   * 
   * Endpoint: subscriptions.create
   * Type: Mutation (protectedProcedure)
   * Input: CreateSubscriptionInput
   * Output: CreateSubscriptionResponse
   */
  create: {
    description: 'Create a new subscription (free trial or paid)',
    input: {
      planId: 'string', // Supports UI concepts: free, paid OR DB enums: FREE, PAID
      paymentMethodCollection: 'always | if_required', // optional, default: always
    },
    example: `
    // Free plan
    const freeSubscription = await trpc.subscriptions.create.mutate({
      planId: 'FREE',
      paymentMethodCollection: 'if_required'
    })
    
    // Paid plan
    const paidSubscription = await trpc.subscriptions.create.mutate({
      planId: 'PAID',
      paymentMethodCollection: 'always'
    })
    `,
    errorCodes: ['BAD_REQUEST', 'CONFLICT', 'PAYMENT_REQUIRED', 'INTERNAL_SERVER_ERROR'],
    notes: [
      'Automatically maps UI plan concepts to database enums',
      'Prevents duplicate active subscriptions',
      'Handles both trial and paid plan creation',
      'Returns client_secret for payment completion when needed'
    ]
  },

  /**
   * 6. UPDATE SUBSCRIPTION
   * 
   * Endpoint: subscriptions.update
   * Type: Mutation (protectedProcedure)
   * Input: UpdateSubscriptionInput
   * Output: SubscriptionWithPlan
   */
  update: {
    description: 'Update subscription plan or billing period',
    input: {
      planId: 'PlanType', // optional - FREE, PAID
    },
    example: `
    // Change plan only
    const updated = await trpc.subscriptions.update.mutate({
      planId: 'PAID'
    })
    
    // Downgrade to free
    const downgrade = await trpc.subscriptions.update.mutate({
      planId: 'FREE'
    })
    `,
    errorCodes: ['NOT_FOUND', 'BAD_REQUEST', 'INTERNAL_SERVER_ERROR'],
    notes: [
      'Uses proration by default',
      'Updates both Stripe and database',
      'Returns updated subscription with new plan details'
    ]
  },

  /**
   * 7. CANCEL SUBSCRIPTION
   * 
   * Endpoint: subscriptions.cancel
   * Type: Mutation (protectedProcedure)
   * Input: CancelSubscriptionInput
   * Output: { success: boolean, message: string }
   */
  cancel: {
    description: 'Cancel subscription (at end of current period)',
    input: {
      subscriptionId: 'string', // UUID of subscription to cancel
    },
    example: `
    const result = await trpc.subscriptions.cancel.mutate({
      subscriptionId: 'subscription-uuid'
    })
    // Returns: { success: true, message: 'Subscription canceled successfully' }
    `,
    errorCodes: ['NOT_FOUND', 'INTERNAL_SERVER_ERROR'],
    notes: [
      'Cancels at end of current billing period',
      'User retains access until period end',
      'Updates both Stripe and database'
    ]
  },

  /**
   * 8. CREATE CUSTOMER PORTAL SESSION
   * 
   * Endpoint: subscriptions.createPortalSession
   * Type: Mutation (protectedProcedure)
   * Input: CreatePortalSessionInput (optional)
   * Output: { url: string, sessionId?: string }
   */
  createPortalSession: {
    description: 'Create Stripe customer portal session for billing management',
    input: {
      returnUrl: 'string', // optional - URL to return to after portal session
    },
    example: `
    const portalSession = await trpc.subscriptions.createPortalSession.mutate({
      returnUrl: 'https://app.tenantflow.com/billing'
    })
    // Returns: { url: 'https://billing.stripe.com/session/...', sessionId: 'bps_...' }
    
    // Redirect user to portal
    window.location.href = portalSession.url
    `,
    errorCodes: ['PRECONDITION_FAILED', 'NOT_FOUND', 'INTERNAL_SERVER_ERROR'],
    notes: [
      'Requires existing Stripe customer (i.e., user must have a subscription)',
      'Allows users to update payment methods, view invoices, etc.',
      'Automatically determines customer from user context'
    ]
  },

  /**
   * 9. CHECK ACTION PERMISSIONS
   * 
   * Endpoint: subscriptions.canPerformAction
   * Type: Query (protectedProcedure)
   * Input: { action: ActionType }
   * Output: { allowed: boolean, reason?: string, upgradeRequired: boolean }
   */
  canPerformAction: {
    description: 'Check if user can perform action based on plan limits',
    input: {
      action: 'property | tenant | api | storage | leaseGeneration',
    },
    example: `
    const canAddProperty = await trpc.subscriptions.canPerformAction.query({
      action: 'property'
    })
    
    if (!canAddProperty.allowed) {
      if (canAddProperty.upgradeRequired) {
        // Show upgrade prompt
        console.log(canAddProperty.reason) // "You've reached the limit for property on your current plan"
      }
    }
    `,
    errorCodes: ['INTERNAL_SERVER_ERROR'],
    notes: [
      'Checks current usage against plan limits',
      'Useful for showing upgrade prompts',
      'Returns specific reason when action is not allowed'
    ]
  },
}

/**
 * PLAN MAPPING INTEGRATION
 * 
 * The endpoints handle automatic mapping between UI concepts and database enums:
 */
export const planMappingDocumentation = {
  uiToDb: {
    'free': 'FREE',
    'FREE': 'FREE',
    'paid': 'PAID',
    'PAID': 'PAID'
  },

  supportedInputs: [
    'Direct DB enum values: FREE, PAID',
    'UI concepts (lowercase): free, paid'
  ],

  notes: [
    'Simple 2-plan system for MVP',
    'Plan mapping handled automatically in endpoints'
  ]
}

/**
 * STRIPE MCP INTEGRATION EXAMPLES
 * 
 * These functions demonstrate how the tRPC endpoints integrate with Stripe via MCP:
 */
export const stripeMcpIntegrationExamples = {
  /**
   * Example: Create a customer and subscription using MCP tools
   */
  async createCustomerAndSubscription() {
    // This would be done internally by the subscription service
    // but here's how it integrates with Stripe MCP:

    // 1. Create customer
    const customer = await mcpStripe.createCustomer({
      name: 'Test User',
      email: 'test@example.com'
    })

    // 2. Create subscription
    const subscription = await mcpStripe.createSubscription({
      customer: customer.id,
      price: 'price_1Rbnyk00PMlKUSP0oGJV2i1G', // Starter monthly
      quantity: 1
    })

    return { customer, subscription }
  },

  /**
   * Example: Update subscription plan using MCP
   */
  async updateSubscriptionPlan(subscriptionId: string, newPriceId: string) {
    const updatedSubscription = await mcpStripe.updateSubscription({
      subscription: subscriptionId,
      items: [
        {
          price: newPriceId,
          quantity: 1
        }
      ],
      proration_behavior: 'create_prorations'
    })

    return updatedSubscription
  },

  /**
   * Example: Cancel subscription using MCP
   */
  async cancelSubscription(subscriptionId: string) {
    const canceledSubscription = await mcpStripe.cancelSubscription({
      subscription: subscriptionId
    })

    return canceledSubscription
  }
}

/**
 * ERROR HANDLING PATTERNS
 */
export const errorHandlingExamples = {
  /**
   * Frontend error handling for subscription operations
   */
  frontendErrorHandling: `
    try {
      const subscription = await trpc.subscriptions.create.mutate({
        planId: 'growth',
        billingPeriod: 'MONTHLY'
      })
      
      // Handle success
      if (subscription.clientSecret) {
        // Complete payment with Stripe Elements
        await stripe.confirmPayment({
          elements,
          clientSecret: subscription.clientSecret,
          confirmParams: {
            return_url: 'https://app.tenantflow.com/billing/success'
          }
        })
      }
    } catch (error) {
      if (error.data?.code === 'CONFLICT') {
        // User already has subscription
        showMessage('You already have an active subscription')
      } else if (error.data?.code === 'PAYMENT_REQUIRED') {
        // Payment failed
        showMessage('Payment failed: ' + error.message)
      } else {
        // Generic error
        showMessage('Something went wrong. Please try again.')
      }
    }
  `,

  /**
   * Common error codes and their meanings
   */
  errorCodes: {
    'BAD_REQUEST': 'Invalid input data (e.g., invalid plan ID)',
    'CONFLICT': 'User already has active subscription',
    'NOT_FOUND': 'Subscription or user not found',
    'PAYMENT_REQUIRED': 'Payment failed or required',
    'PRECONDITION_FAILED': 'Missing prerequisite (e.g., no Stripe customer)',
    'INTERNAL_SERVER_ERROR': 'Unexpected server error'
  }
}

/**
 * TESTING THE ENDPOINTS
 * 
 * Use these patterns to test the subscription endpoints:
 */
export const testingExamples = {
  /**
   * Test free trial creation
   */
  testFreeTrialCreation: `
    const result = await trpc.subscriptions.create.mutate({
      planId: 'freeTrial',
      billingPeriod: 'MONTHLY',
      paymentMethodCollection: 'if_required'
    })
    
    expect(result.status).toBe('trialing')
    expect(result.trialEnd).toBeTruthy()
    expect(result.clientSecret).toBeNull() // No payment required for trial
  `,

  /**
   * Test paid subscription creation
   */
  testPaidSubscriptionCreation: `
    const result = await trpc.subscriptions.create.mutate({
      planId: 'starter',
      billingPeriod: 'MONTHLY',
      paymentMethodCollection: 'always'
    })
    
    expect(result.status).toBe('incomplete')
    expect(result.clientSecret).toBeTruthy() // Payment required
  `,

  /**
   * Test subscription update
   */
  testSubscriptionUpdate: `
    const updated = await trpc.subscriptions.update.mutate({
      planId: '',
      billingPeriod: 'ANNUAL'
    })
    
    expect(updated.planId).toBe('')
    expect(updated.billingPeriod).toBe('ANNUAL')
    expect(updated.plan.name).toBe('Growth')
  `,
}

export default {
  subscriptionEndpointsDocumentation,
  planMappingDocumentation,
  stripeMcpIntegrationExamples,
  errorHandlingExamples,
  testingExamples
}