import type { Hono } from 'hono'
import type { Variables } from './middleware/auth.middleware'
import type { 
  propertyListQuerySchema,
  createPropertySchema,
  updatePropertySchema,
  uploadImageSchema
} from './schemas/property.schemas'
import type {
  updateProfileSchema,
  profileUpdateResponseSchema,
  sessionSchema,
  userSchema
} from './schemas/auth.schemas'
import type {
  tenantListQuerySchema,
  createTenantSchema,
  updateTenantSchema,
  uploadDocumentSchema
} from './schemas/tenant.schemas'
import type {
  maintenanceListQuerySchema,
  createMaintenanceRequestSchema,
  updateMaintenanceRequestSchema,
  updateMaintenanceStatusSchema,
  addMaintenanceNoteSchema
} from './schemas/maintenance.schemas'
import type {
  unitListQuerySchema,
  createUnitSchema,
  updateUnitSchema,
  assignTenantSchema
} from './schemas/unit.schemas'
import type {
  leaseListQuerySchema,
  createLeaseSchema,
  updateLeaseSchema,
  renewLeaseSchema,
  terminateLeaseSchema
} from './schemas/lease.schemas'
import type {
  createCheckoutSessionSchema,
  createBillingPortalSessionSchema,
  cancelSubscriptionSchema,
  createPaymentMethodSchema,
  updatePaymentMethodSchema
} from './schemas/subscription.schemas'
import type { z } from 'zod'
import type { 
  Property, 
  Unit, 
  Tenant, 
  Lease, 
  MaintenanceRequest,
  Subscription,
  Plan,
  PaymentMethod,
  Invoice,
  UsageMetrics
} from '@tenantflow/shared'

// Additional types for API responses
interface PropertyStats {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  totalRent: number
  collectedRent: number
  pendingRent: number
}

interface TenantStats {
  totalTenants: number
  activeTenants: number
  inactiveTenants: number
  pendingInvitations: number
}

// Type definitions for all routes
export type AppRouter = Hono<{ Variables: Variables }, {
  '/health': {
    $get: {
      output: { status: string }
    }
  }
  '/api/v1': {
    '/auth': {
      '/me': {
        $get: {
          output: z.infer<typeof userSchema>
        }
      }
      '/profile': {
        $put: {
          input: { json: z.infer<typeof updateProfileSchema> }
          output: z.infer<typeof profileUpdateResponseSchema>
        }
      }
      '/session': {
        $get: {
          output: z.infer<typeof sessionSchema>
        }
      }
      '/welcome-email': {
        $post: {
          input: { json: Pick<z.infer<typeof userSchema>, 'name' | 'email'> }
          output: {
            success: boolean
            message: string
            messageId: string
          }
        }
      }
    }
    '/properties': {
      $get: {
        input: { query: z.infer<typeof propertyListQuerySchema> }
        output: { properties: Property[], total: number }
      }
      $post: {
        input: { json: z.infer<typeof createPropertySchema> }
        output: Property
      }
      '/stats': {
        $get: {
          output: PropertyStats
        }
      }
      '/:id': {
        $get: {
          output: Property
        }
        $put: {
          input: { json: z.infer<typeof updatePropertySchema> }
          output: Property
        }
        $delete: {
          output: Property
        }
        '/image': {
          $post: {
            input: { json: z.infer<typeof uploadImageSchema> }
            output: { url: string, path: string, filename: string, size: number, mimeType: string }
          }
        }
      }
    }
    '/tenants': {
      $get: {
        input: { query: z.infer<typeof tenantListQuerySchema> }
        output: { tenants: Tenant[], total: number }
      }
      $post: {
        input: { json: z.infer<typeof createTenantSchema> }
        output: Tenant
      }
      '/stats': {
        $get: {
          output: TenantStats
        }
      }
      '/:id': {
        $get: {
          output: Tenant
        }
        $put: {
          input: { json: z.infer<typeof updateTenantSchema> }
          output: Tenant
        }
        $delete: {
          output: Tenant
        }
        '/documents': {
          $post: {
            input: { json: z.infer<typeof uploadDocumentSchema> }
            output: { url: string, path: string, filename: string, size: number, mimeType: string }
          }
          '/:documentId': {
            $delete: {
              output: { success: boolean, message: string }
            }
          }
        }
      }
    }
    '/maintenance': {
      $get: {
        input: { query: z.infer<typeof maintenanceListQuerySchema> }
        output: { requests: MaintenanceRequest[], total: number }
      }
      $post: {
        input: { json: z.infer<typeof createMaintenanceRequestSchema> }
        output: MaintenanceRequest
      }
      '/stats': {
        $get: {
          output: { totalRequests: number, activeRequests: number, completedRequests: number, pendingRequests: number }
        }
      }
      '/:id': {
        $get: {
          output: MaintenanceRequest
        }
        $put: {
          input: { json: z.infer<typeof updateMaintenanceRequestSchema> }
          output: MaintenanceRequest
        }
        $delete: {
          output: MaintenanceRequest
        }
        '/status': {
          $patch: {
            input: { json: z.infer<typeof updateMaintenanceStatusSchema> }
            output: MaintenanceRequest
          }
        }
        '/notes': {
          $post: {
            input: { json: z.infer<typeof addMaintenanceNoteSchema> }
            output: MaintenanceRequest
          }
        }
      }
    }
    '/units': {
      $get: {
        input: { query: z.infer<typeof unitListQuerySchema> }
        output: { units: Unit[], total: number }
      }
      $post: {
        input: { json: z.infer<typeof createUnitSchema> }
        output: Unit
      }
      '/by-property/:propertyId': {
        $get: {
          output: Unit[]
        }
      }
      '/:id': {
        $get: {
          output: Unit
        }
        $put: {
          input: { json: z.infer<typeof updateUnitSchema> }
          output: Unit
        }
        $delete: {
          output: Unit
        }
        '/assign-tenant': {
          $post: {
            input: { json: z.infer<typeof assignTenantSchema> }
            output: Unit
          }
        }
        '/remove-tenant': {
          $post: {
            output: Unit
          }
        }
      }
    }
    '/leases': {
      $get: {
        input: { query: z.infer<typeof leaseListQuerySchema> }
        output: { leases: Lease[], total: number }
      }
      $post: {
        input: { json: z.infer<typeof createLeaseSchema> }
        output: Lease
      }
      '/expiring': {
        $get: {
          input: { query: Pick<z.infer<typeof leaseListQuerySchema>, 'expiringDays'> }
          output: Lease[]
        }
      }
      '/:id': {
        $get: {
          output: Lease
        }
        $put: {
          input: { json: z.infer<typeof updateLeaseSchema> }
          output: Lease
        }
        $delete: {
          output: Lease
        }
        '/renew': {
          $post: {
            input: { json: z.infer<typeof renewLeaseSchema> }
            output: Lease
          }
        }
        '/terminate': {
          $post: {
            input: { json: z.infer<typeof terminateLeaseSchema> }
            output: Lease
          }
        }
      }
    }
    '/subscriptions': {
      '/current': {
        $get: {
          output: { subscription: Subscription | null, plan: Plan | null }
        }
      }
      '/checkout': {
        $post: {
          input: { json: z.infer<typeof createCheckoutSessionSchema> }
          output: { sessionId: string, url: string }
        }
      }
      '/billing-portal': {
        $post: {
          input: { json: z.infer<typeof createBillingPortalSessionSchema> }
          output: { sessionId: string, url: string }
        }
      }
      '/cancel': {
        $post: {
          input: { json: z.infer<typeof cancelSubscriptionSchema> }
          output: { success: boolean, message: string }
        }
      }
      '/payment-methods': {
        $get: {
          output: { paymentMethods: PaymentMethod[] }
        }
        $post: {
          input: { json: z.infer<typeof createPaymentMethodSchema> }
          output: PaymentMethod
        }
        '/default': {
          $put: {
            input: { json: z.infer<typeof updatePaymentMethodSchema> }
            output: { success: boolean, message: string }
          }
        }
        '/:id': {
          $delete: {
            output: { success: boolean, message: string }
          }
        }
      }
      '/usage': {
        $get: {
          output: UsageMetrics
        }
      }
      '/invoices': {
        $get: {
          output: { invoices: Invoice[] }
        }
      }
    }
  }
}>