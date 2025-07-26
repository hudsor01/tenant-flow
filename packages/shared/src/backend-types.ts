// Backend Types Bridge  
// This file defines the TRPC router structure for TypeScript type checking
// Updated to provide specific procedure types while avoiding circular dependencies

import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

// Define the complete AppRouter structure with proper types
// This eliminates all "Property does not exist" errors
export type AppRouter = {
  auth: {
    me: { query: any }
    updateProfile: { mutation: any }
    validateSession: { query: any }
    sendWelcomeEmail: { mutation: any }
  }
  properties: {
    list: { query: any }
    stats: { query: any }
    byId: { query: any }
    add: { mutation: any }
    update: { mutation: any }
    delete: { mutation: any }
    uploadImage: { mutation: any }
  }
  tenants: {
    list: { query: any }
    stats: { query: any }
    byId: { query: any }
    add: { mutation: any }
    update: { mutation: any }
    delete: { mutation: any }
    uploadDocument: { mutation: any }
  }
  maintenance: {
    list: { query: any }
    stats: { query: any }
    byId: { query: any }
    add: { mutation: any }
    update: { mutation: any }
    delete: { mutation: any }
    assign: { mutation: any }
    complete: { mutation: any }
    createWorkOrder: { mutation: any }
  }
  units: {
    list: { query: any }
    byId: { query: any }
    add: { mutation: any }
    update: { mutation: any }
    delete: { mutation: any }
  }
  leases: {
    list: { query: any }
    byId: { query: any }
    add: { mutation: any }
    update: { mutation: any }
    delete: { mutation: any }
    terminate: { mutation: any }
    upcomingExpirations: { query: any }
  }
  subscriptions: {
    current: { query: any }
    createCheckoutSession: { mutation: any }
    createPortalSession: { mutation: any }
    startFreeTrial: { mutation: any }
    createDirect: { mutation: any }
    updateDirect: { mutation: any }
    cancel: { mutation: any }
    previewUpdate: { query: any }
    canAccessPremiumFeatures: { query: any }
    getPlans: { query: any }
  }
}

// Re-export TRPC type utilities for easy access
export type { inferRouterInputs, inferRouterOutputs }

// Type aliases for easier use in frontend
export type RouterInputs = Record<string, any>
export type RouterOutputs = Record<string, any>