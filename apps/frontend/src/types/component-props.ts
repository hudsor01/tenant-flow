// Centralized component prop types to reduce duplication across components
import type { ReactNode } from 'react'
import type { Property, Unit } from '@tenantflow/shared/types/properties'
import type { Tenant } from '@tenantflow/shared/types/tenants'
import type { MaintenanceRequest } from '@tenantflow/shared/types/maintenance'
import type { Notification } from '@tenantflow/shared/types/notifications'

// Modal prop interfaces
export interface BaseModalProps {
	isOpen: boolean
	onClose: () => void
}

export interface FormModalProps extends BaseModalProps {
	mode?: 'create' | 'edit'
}

// Property component props
export interface PropertyFormModalProps extends FormModalProps {
	property?: Property
	onSuccess?: () => void
}

export interface PropertyCardProps {
	property: Property
	onEdit?: (property: Property) => void
	onDelete?: (propertyId: string | Property) => void  // Support both ID and full property
	onViewDetails?: (propertyId: string) => void
}

export interface PropertyErrorStateProps {
	error: string
	onRetry?: () => void
}

export interface PropertyHeaderSectionProps {
	property: Property
	onEdit?: () => void
	onDelete?: () => void
}

export interface PropertyStatsSectionProps {
	property: Property
}

// Unit component props
export interface UnitFormModalProps extends FormModalProps {
	propertyId: string
	unit?: Unit
}

export interface UnitCardProps {
	unit: Unit
	onEdit?: (unit: Unit) => void
	onDelete?: (unitId: string) => void
	onViewDetails?: (unitId: string) => void
}

// Tenant component props
export interface TenantFormModalProps extends FormModalProps {
	tenant?: Tenant
	propertyId?: string
	unitId?: string
}

export interface TenantCardProps {
	tenant: Tenant
	onEdit?: (tenant: Tenant) => void
	onDelete?: (tenantId: string) => void
	onViewDetails?: (tenantId: string) => void
}

// Maintenance component props
export interface MaintenanceRequestModalProps extends BaseModalProps {
	request?: MaintenanceRequest
}

export interface MaintenanceCardProps {
	request: MaintenanceRequest
	onEdit?: (request: MaintenanceRequest) => void
	onDelete?: (requestId: string) => void
	onUpdateStatus?: (requestId: string, status: string) => void
}


// Table component props
export interface TableColumn<T> {
	key: keyof T | string
	label: string
	render?: (item: T) => ReactNode
	sortable?: boolean
	width?: string
}

export interface VirtualizedTableProps<T> {
	data: T[]
	columns: TableColumn<T>[]
	onEdit?: (item: T) => void
	onDelete?: (id: string) => void
	loading?: boolean
	emptyMessage?: string
	height?: number
}

// List component props
export interface ListProps<T> {
	items: T[]
	loading?: boolean
	error?: string | null
	emptyMessage?: string
	onRefresh?: () => void
}


export interface PropertyListProps extends ListProps<Property> {
	onEdit?: (property: Property) => void
	onDelete?: (propertyId: string) => void
	onViewDetails?: (propertyId: string) => void
}

// Form section props
export interface FormSectionProps {
	title: string
	description?: string
	children: ReactNode
	icon?: React.ComponentType<{ className?: string }>
}

// Status component props
export interface StatusBadgeProps {
	status: string
	variant?: 'default' | 'outline' | 'secondary'
	size?: 'sm' | 'md' | 'lg'
}

// Navigation props
export interface NavigationItem {
	label: string
	href: string
	icon?: React.ComponentType<{ className?: string }>
	active?: boolean
	badge?: string | number
}

export interface NavigationProps {
	items: NavigationItem[]
	orientation?: 'horizontal' | 'vertical'
	variant?: 'default' | 'sidebar' | 'tabs'
}

// Layout props
export interface LayoutProps {
	children: ReactNode
	title?: string
	description?: string
	showBreadcrumbs?: boolean
	actions?: ReactNode
}

export interface SidebarLayoutProps extends LayoutProps {
	sidebarContent?: ReactNode
	sidebarWidth?: 'sm' | 'md' | 'lg'
}

// Animation props
export interface AnimationProviderProps {
	children: ReactNode
	disabled?: boolean
}

export interface ScrollRevealProps {
	children: ReactNode
	delay?: number
	direction?: 'up' | 'down' | 'left' | 'right'
	distance?: number
}

// SEO props
export interface SEOProps {
	title: string
	description?: string
	keywords?: string[]
	image?: string
	url?: string
	type?: 'website' | 'article'
}

export interface BreadcrumbItem {
	label: string
	href?: string
}

export interface BreadcrumbsProps {
	items: BreadcrumbItem[]
	separator?: ReactNode
}

// Dashboard props
export interface StatCardProps {
	title: string
	value: string | number
	change?: number
	changeLabel?: string
	icon?: React.ComponentType<{ className?: string }>
	trend?: 'up' | 'down' | 'neutral'
	loading?: boolean
}

export interface ChartProps {
	data: Record<string, string | number | null>[]
	width?: number
	height?: number
	loading?: boolean
	error?: string | null
}

// Notification props
export interface NotificationProps {
	notification: Notification
	onMarkRead?: (notificationId: string) => void
	onDelete?: (notificationId: string) => void
}

export interface NotificationListProps {
	notifications: Notification[]
	onMarkAllRead?: () => void
	onClearAll?: () => void
	loading?: boolean
}