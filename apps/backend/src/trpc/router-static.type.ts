/**
 * Static Router Type Definition for TRPC v11
 * 
 * This file provides a static type definition for the AppRouter
 * to work around TRPC v11's strict type checking with dependency injection.
 * 
 * IMPORTANT: This type must be kept in sync with the actual router structure
 * in app-router.ts. Any changes to the router structure should be reflected here.
 */

import type { AnyProcedure, AnyRouter } from '@trpc/server'

// Define the AppRouter type structure that matches our actual router
export interface AppRouter extends AnyRouter {
  auth: AnyRouter & {
    me: AnyProcedure
    updateProfile: AnyProcedure
    validateSession: AnyProcedure
    sendWelcomeEmail: AnyProcedure
  }
  properties: AnyRouter & {
    list: AnyProcedure
    stats: AnyProcedure
    byId: AnyProcedure
    add: AnyProcedure
    update: AnyProcedure
    delete: AnyProcedure
    uploadImage: AnyProcedure
  }
  tenants: AnyRouter & {
    list: AnyProcedure
    stats: AnyProcedure
    byId: AnyProcedure
    add: AnyProcedure
    update: AnyProcedure
    delete: AnyProcedure
    uploadDocument: AnyProcedure
  }
  maintenance: AnyRouter & {
    list: AnyProcedure
    stats: AnyProcedure
    byId: AnyProcedure
    add: AnyProcedure
    update: AnyProcedure
    delete: AnyProcedure
    assign: AnyProcedure
    complete: AnyProcedure
    createWorkOrder: AnyProcedure
  }
  units: AnyRouter & {
    list: AnyProcedure
    byId: AnyProcedure
    add: AnyProcedure
    update: AnyProcedure
    delete: AnyProcedure
  }
  leases: AnyRouter & {
    list: AnyProcedure
    byId: AnyProcedure
    add: AnyProcedure
    update: AnyProcedure
    delete: AnyProcedure
    terminate: AnyProcedure
    upcomingExpirations: AnyProcedure
  }
  subscriptions: AnyRouter & {
    current: AnyProcedure
    createCheckoutSession: AnyProcedure
    createPortalSession: AnyProcedure
    startFreeTrial: AnyProcedure
    canAccessPremiumFeatures: AnyProcedure
    getPlans: AnyProcedure
  }
}