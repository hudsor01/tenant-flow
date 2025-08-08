/**
 * API exports
 * Centralized exports for all API modules
 */

export { api } from './endpoints';
export { AuthApi } from '../auth-api';
export { PropertiesApi } from './properties';
export { TenantsApi } from './tenants';
export { MaintenanceApi } from './maintenance';
export { LeasesApi } from './leases';
export { BillingApi } from './billing';
export { apiClient } from '../api-client';

// Re-export types for convenience
export type * from './properties';
export type * from './tenants';
export type * from './maintenance';
export type * from './leases';
export type * from './billing';