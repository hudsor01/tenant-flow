/**
 * Component prop type definitions
 * Centralizes all component prop types to eliminate duplication
 */

import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from 'react'
import type { 
	MaintenanceRequest, 
	Property, 
	Tenant, 
	Lease,
	Invoice
} from '@repo/shared'

// Navigation Components
export interface NavigationLinkProps {
	href: string
	label: string
	icon?: ReactNode
	isActive?: boolean
	badge?: string | number
	onClick?: () => void
}

export interface NavigationGroupProps {
	title: string
	items: NavigationLinkProps[]
	isCollapsed?: boolean
	onToggle?: () => void
}

export interface BreadcrumbsProps {
	items: {
		label: string
		href?: string
		isActive?: boolean
	}[]
	separator?: ReactNode
}

export interface TabNavigationProps {
	tabs: {
		id: string
		label: string
		href?: string
		icon?: ReactNode
		badge?: string | number
	}[]
	activeTab: string
	onTabChange?: (tabId: string) => void
}

export interface MobileNavigationProps {
	isOpen: boolean
	onClose: () => void
	items: NavigationLinkProps[]
}

// Maintenance Components
export interface MaintenanceDetailProps {
	request: MaintenanceRequest
	onUpdate?: (request: MaintenanceRequest) => void
	onDelete?: (id: string) => void
	isLoading?: boolean
}

export interface PrioritySelectorProps {
	value: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
	onChange: (value: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY') => void
	disabled?: boolean
}

export interface UnitSelectorProps {
	propertyId: string
	value?: string
	onChange: (unitId: string) => void
	disabled?: boolean
	required?: boolean
}

export interface CategorySelectorProps {
	value: string
	onChange: (category: string) => void
	disabled?: boolean
	placeholder?: string
}

// Invoice Components
export interface InvoiceDetailsProps {
	invoice: Invoice
	onEdit?: (invoice: Invoice) => void
	onDelete?: (id: string) => void
	isLoading?: boolean
}

export interface InvoiceActionsProps {
	invoiceId: string
	onDownload?: () => void
	onEmail?: () => void
	onPrint?: () => void
	onDelete?: () => void
	isLoading?: boolean
}

// Invoice Item type used across invoice components
export interface InvoiceItem {
	id: string
	description: string
	quantity: number
	unitPrice: number
	total: number
}

export interface InvoiceItemsSectionProps {
	items: {
		description: string
		quantity: number
		rate: number
		amount: number
	}[]
	currency?: string
	editable?: boolean
	onChange?: (items: InvoiceItem[]) => void
}

export interface ClientInfoSectionProps {
	client: {
		name: string
		email: string
		phone?: string
		address?: string
	}
	editable?: boolean
	onChange?: (client: ClientInfoSectionProps['client']) => void
}

// Auth Components
export interface AuthGuardProps {
	children: ReactNode
	requiredRole?: string[]
	fallback?: ReactNode
	redirectTo?: string
}

export interface GoogleSignupButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onError'> {
	onSuccess?: (credential: string) => void
	onError?: (error: Error) => void
}

// Property Components
export interface PropertyCardProps {
	property: Property
	onClick?: (property: Property) => void
	onEdit?: (property: Property) => void
	onDelete?: (id: string) => void
	isLoading?: boolean
	variant?: 'default' | 'compact' | 'detailed'
}

// Tenant Components
export interface TenantCardProps {
	tenant: Tenant
	onClick?: (tenant: Tenant) => void
	onEdit?: (tenant: Tenant) => void
	onDelete?: (id: string) => void
	isLoading?: boolean
}

// Lease Components
export interface LeaseCardProps {
	lease: Lease
	onClick?: (lease: Lease) => void
	onEdit?: (lease: Lease) => void
	onDelete?: (id: string) => void
	isLoading?: boolean
}

// Blog Components
export interface BlogContentSectionProps {
	content: string
	author: {
		name: string
		avatar?: string
		bio?: string
	}
	publishedAt: string
	readingTime: number
}

export interface BlogSidebarProps {
	categories: {
		name: string
		count: number
		href: string
	}[]
	recentPosts: {
		title: string
		href: string
		date: string
	}[]
	tags: string[]
}

// SEO Components
export interface LocalBusinessSchemaProps {
	name: string
	description: string
	url: string
	telephone?: string
	address?: {
		streetAddress: string
		addressLocality: string
		addressRegion: string
		postalCode: string
		addressCountry: string
	}
	openingHours?: string[]
}

// Error Components
export interface ErrorBoundaryProps {
	children: ReactNode
	fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
	onError?: (error: Error, errorInfo: { componentStack: string }) => void
}

// Security Components
export interface SafeHTMLProps extends HTMLAttributes<HTMLDivElement> {
	html: string
	allowedTags?: string[]
	allowedAttributes?: Record<string, string[]>
}

// Common UI Components
export interface LoadingSkeletonProps {
	lines?: number
	className?: string
	animate?: boolean
}

export interface EmptyStateProps {
	title: string
	description?: string
	icon?: ReactNode
	action?: {
		label: string
		onClick: () => void
	}
}

