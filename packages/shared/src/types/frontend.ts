/**
 * Frontend-specific types and interfaces
 *
 * Types used in frontend components and UI logic that need to be shared
 * across different parts of the application.
 */

import type { Database } from './supabase.js'
import type { LeaseStatus } from './core.js'

// View type for data table views
export type ViewType = 'grid' | 'table' | 'kanban'

// Export type for CRUD operations
export type CrudMode = 'create' | 'read' | 'edit' | 'delete'

// Export type for export formats
export type ExportFormat = 'excel' | 'pdf' | 'csv'

// Animation preset types
export type AnimationPreset =
  | 'fadeIn'
  | 'slideIn'
  | 'scaleIn'
  | 'slideInFromLeft'
  | 'slideInFromRight'
  | 'slideInFromTop'
  | 'slideInFromBottom'
  | 'zoomIn'
  | 'bounceIn'
  | 'flipIn'
  | 'rotateIn'
  | 'pulse'
  | 'shake'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'

// Financial time range for charts
export type FinancialTimeRange = '7d' | '30d' | '6m' | '1y'

// Subscription status for tenant portal
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | null

// Modal types for modal store
export type ModalType = 'dialog' | 'sheet' | 'drawer' | 'alert' | 'confirm'
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
export type ModalPosition = 'center' | 'top' | 'bottom' | 'left' | 'right'

// Theme modes
export type ThemeMode = 'light' | 'dark' | 'system'

// View preferences
export type ViewPreferences = {
  properties: 'grid' | 'table'
  tenants: 'grid' | 'table'
  leases: 'grid' | 'table'
  maintenance: 'list' | 'kanban'
  payments: 'list' | 'calendar'
}

// Form progress types
export type FormProgress = {
  currentStep: number
 totalSteps: number
 completed: boolean
}

// Bulk operation types
export type BulkOperationType = 'property_import' | 'tenant_import' | 'lease_import'
export type BulkOperationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

// Error boundary types
export type ErrorState = {
  hasError: boolean
 error?: Error
 errorInfo?: string
}

// Navigation types
export type BreadcrumbItem = {
  label: string
  href?: string
 onClick?: () => void
}

// History action types
export type HistoryActionType = 'create' | 'update' | 'delete' | 'view' | 'export' | 'import'

// Loading operation types
export type LoadingOperation = {
  id: string
  type: string
 message?: string
 progress?: number
 total?: number
}

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'

// Chart configuration types
export type ChartConfig = {
  [k: string]: {
    label?: string
    icon?: React.ComponentType
    color?: string
 }
}

// Table column types
export type TableColumn<T> = {
  id: string
  header: string
 accessorKey: string
  cell?: (value: T) => React.ReactNode
  enableSorting?: boolean
 size?: number
 enableHiding?: boolean
}

// Filter types
export type FilterType = 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'boolean'

// Sort types
export type SortDirection = 'asc' | 'desc'

// Enhanced Unit Row type with relations for UI display
export type UnitRow = Database['public']['Tables']['units']['Row'] & {
  property?: {
    name: string
    address: string
 }
  tenant?: {
    name: string
    email: string
    phone?: string
 } | null
 lease?: {
    start_date: string
    end_date: string
    rent_amount: number
    status: LeaseStatus
  } | null
 // Optional enhancement fields for UI display
 marketValue?: number
  lastUpdated?: string
}

// Enhanced Maintenance Request Row type with relations
export type MaintenanceRequestRow =
  Database['public']['Tables']['maintenance_requests']['Row'] & {
    property: { name: string } | null
    unit: { name: string } | null
    assignedTo: { name: string } | null
 }

// Component prop types
export interface ModernExplodedPieChartProps {
	data: Array<{ name: string; value: number; fill?: string }>
	height?: number
	className?: string
	title?: string
	description?: string
	showFooter?: boolean
}

export interface PaginationLinkProps extends React.ComponentProps<'a'> {
	page?: number
	currentPage?: number
	onPageChange?: ((page: number) => void) | ((page: number) => Promise<void>)
	isActive?: boolean
	size?: 'icon' | 'default' | 'sm' | 'lg'
}

// Design system types
export type AnimationType =
	| 'fade'
	| 'slide'
	| 'scale'
	| 'bounce'
	| 'spin'
	| 'pulse'
	| 'fade-in'
	| 'slide-up'
	| 'slide-down'

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'default'

export type BadgeVariant =
	| 'default'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'destructive'
	| 'outline'

export type ButtonVariant =
	| 'default'
	| 'primary'
	| 'destructive'
	| 'outline'
	| 'secondary'
	| 'ghost'
	| 'link'

export type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'

export interface GridColumnsConfig {
	xs?: number
	sm?: number
	md?: number
	lg?: number
	xl?: number
	['2xl']?: number
	default?: number
}

export interface ResponsiveValuesConfig<T = string> {
	xs?: T
	sm?: T
	md?: T
	lg?: T
	xl?: T
	['2xl']?: T
	default?: T
}

// Tailwind theme types
export type TailwindColorName =
	| 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'
	| 'red' | 'orange' | 'amber' | 'yellow' | 'lime'
	| 'green' | 'emerald' | 'teal' | 'cyan' | 'sky'
	| 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia'
	| 'pink' | 'rose'

export type TailwindRadiusValue = 0 | 0.3 | 0.5 | 0.65 | 0.75 | 1.0

// Re-export auth form types for frontend components
export type { AuthFormProps, LoginFormData, SignupFormData } from './auth.js'
