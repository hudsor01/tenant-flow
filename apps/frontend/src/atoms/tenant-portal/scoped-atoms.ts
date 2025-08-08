/**
 * Tenant Portal Atoms
 * TODO: Implement jotai-scope for complete tenant data isolation
 */
import { atom } from 'jotai'

// Basic atom for current tenant ID
export const currentTenantIdAtom = atom<string | null>(null)

// Basic atoms for tenant form data
export const maintenanceRequestFormAtom = atom({
  title: '',
  description: '',
  priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  category: 'GENERAL' as string,
  images: [] as string[],
})

export const paymentMethodAtom = atom({
  type: 'CARD' as 'CARD' | 'BANK',
  last4: '',
  expiryMonth: 0,
  expiryYear: 0,
})

export const tenantNotificationPrefsAtom = atom({
  emailNotifications: true,
  smsNotifications: false,
  maintenanceUpdates: true,
  paymentReminders: true,
  leaseRenewalAlerts: true,
})

// TODO: Add back jotai-tanstack-query atoms when scoping is fixed
// export const tenantMaintenanceAtom = atomWithQuery(...)
// export const tenantPaymentsAtom = atomWithQuery(...)
// export const tenantLeaseAtom = atomWithQuery(...)
// export const tenantDocumentsAtom = atomWithQuery(...)