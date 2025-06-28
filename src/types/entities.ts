// Centralized entity types from Supabase for easier imports
import type { Database } from './supabase-generated'

// Main entity types
export type User = Database['public']['Tables']['User']['Row']
export type Property = Database['public']['Tables']['Property']['Row']
export type Unit = Database['public']['Tables']['Unit']['Row']
export type Tenant = Database['public']['Tables']['Tenant']['Row']
export type Lease = Database['public']['Tables']['Lease']['Row']
export type Payment = Database['public']['Tables']['Payment']['Row']
export type MaintenanceRequest = Database['public']['Tables']['MaintenanceRequest']['Row']
export type Document = Database['public']['Tables']['Document']['Row']
export type Notification = Database['public']['Tables']['Notification']['Row']

// Enum types
export type {
  DocumentType,
  InvitationStatus,
  LeaseStatus,
  MaintenanceCategory,
  NotificationPriority,
  NotificationType,
  PaymentStatus,
  PaymentType,
  PlanType,
  Priority,
  PropertyType,
  RequestStatus,
  SubStatus,
  UnitStatus,
  UserRole
} from './supabase-generated'

// Insert types for forms
export type PropertyInsert = Database['public']['Tables']['Property']['Insert']
export type UnitInsert = Database['public']['Tables']['Unit']['Insert']
export type TenantInsert = Database['public']['Tables']['Tenant']['Insert']
export type LeaseInsert = Database['public']['Tables']['Lease']['Insert']
export type PaymentInsert = Database['public']['Tables']['Payment']['Insert']

// Update types for editing
export type PropertyUpdate = Database['public']['Tables']['Property']['Update']
export type UnitUpdate = Database['public']['Tables']['Unit']['Update']
export type TenantUpdate = Database['public']['Tables']['Tenant']['Update']
export type LeaseUpdate = Database['public']['Tables']['Lease']['Update']
export type PaymentUpdate = Database['public']['Tables']['Payment']['Update']