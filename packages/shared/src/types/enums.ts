/**
 * Type-only exports for database enums
 *
 * IMPORTANT: These are convenience type exports only - no runtime code.
 * All enums are defined in the database and accessed via generated types.
 *
 * This file follows the ENUM STANDARDIZATION rules:
 * - Database is single source of truth
 * - No TypeScript enum definitions
 * - Type-only exports for developer convenience
 */

import type { Database } from './supabase-generated.js'

// Property Management Enums
export type PropertyType = Database['public']['Enums']['PropertyType']
export type PropertyStatus = Database['public']['Enums']['PropertyStatus']
export type UnitStatus = Database['public']['Enums']['UnitStatus']

// Lease Management Enums
export type LeaseStatus = Database['public']['Enums']['LeaseStatus']
export type LeaseType = Database['public']['Enums']['LeaseType']

// Tenant Management Enums
export type TenantStatus = Database['public']['Enums']['TenantStatus']

// Maintenance Enums
export type RequestStatus = Database['public']['Enums']['RequestStatus']
export type Priority = Database['public']['Enums']['Priority']
export type MaintenanceCategory = Database['public']['Enums']['MaintenanceCategory']

// Payment & Billing Enums
export type RentPaymentStatus = Database['public']['Enums']['RentPaymentStatus']
export type RentChargeStatus = Database['public']['Enums']['RentChargeStatus']
export type CustomerInvoiceStatus = Database['public']['Enums']['CustomerInvoiceStatus']
export type LateFeeType = Database['public']['Enums']['LateFeeType']

// User & Auth Enums
export type UserRole = Database['public']['Enums']['UserRole']

// Subscription Enums
export type SubStatus = Database['public']['Enums']['SubStatus']
export type PlanType = Database['public']['Enums']['PlanType']

// Document Management Enums
export type DocumentType = Database['public']['Enums']['DocumentType']

// Notification & Reminder Enums
export type ReminderType = Database['public']['Enums']['ReminderType']
export type ReminderStatus = Database['public']['Enums']['ReminderStatus']

// Blog Enums
export type BlogStatus = Database['public']['Enums']['BlogStatus']
export type BlogCategory = Database['public']['Enums']['BlogCategory']

// Activity Tracking
export type ActivityEntityType = Database['public']['Enums']['ActivityEntityType']

/**
 * Re-export all enums as a namespace for easy access
 * Usage: import { DatabaseEnums } from '@repo/shared'
 *        const status: DatabaseEnums.UnitStatus = 'VACANT'
 */
export type DatabaseEnums = Database['public']['Enums']