/**
 * Frontend-specific types that don't fit in core.ts
 * These are UI component and frontend utility types
 */

import type { Database } from './core.js'


// CHART COMPONENT TYPES
export type TrendDirection = 'up' | 'down' | 'neutral'
export type ColorVariant =
	| 'success'
	| 'primary'
	| 'revenue'
	| 'property'
	| 'warning'
	| 'info'
	| 'neutral'

export interface SparklineData {
	value: number
	period: string
}

export interface MetricConfig {
	title: string
	value: string | number
	description: string
	change?: {
		value: string
		trend: 'up' | 'down' | 'neutral'
		period?: string
	}
	progress?: {
		current: number
		target: number
		label?: string
	}
	sparkline?: Array<{ value: number; period: string }>
	icon: React.ComponentType<{ className?: string }>
	colorVariant:
		| 'success'
		| 'primary'
		| 'revenue'
		| 'property'
		| 'warning'
		| 'info'
		| 'neutral'
}

// Theme color types for tailwind utilities
export type TailwindColorName =
	| 'blue'
	| 'slate'
	| 'stone'
	| 'red'
	| 'orange'
	| 'amber'
	| 'yellow'
	| 'lime'
	| 'green'
	| 'emerald'
	| 'teal'
	| 'cyan'
	| 'sky'
	| 'indigo'
	| 'violet'

export type TailwindRadiusValue = 0 | 0.3 | 0.5 | 0.65 | 0.75 | 1.0

export interface ChartContainerProps extends React.ComponentProps<'div'> {
	title: string
	description?: string
	children: React.ReactNode
	height?: number
	className?: string
}

export interface ModernExplodedPieChartProps {
	data?: Array<{
		name: string
		value: number
		fill: string
	}>
	height?: number
	className?: string
	title?: string
	description?: string
	showFooter?: boolean
}

export interface ExtendedCheckoutFormProps {
	amount: number
	currency?: string
	metadata?: Record<string, string>
	onSuccess?: () => void
	onError?: (error: Error) => void
	business?: {
		name: string
		description?: string
		trustSignals?: string[]
	}
	customerEmail?: string
	enableExpressCheckout?: boolean
	showTrustSignals?: boolean
	showSecurityNotice?: boolean
	planName?: string
	features?: string[]
}

export interface CreatePaymentIntentRequest {
	amount: number
	currency: string
	description?: string
	customerId?: string
	customerEmail?: string
	metadata?: Record<string, string>
}

export interface CustomerPortalCardProps {
	className?: string
	showStats?: boolean
	showTestimonial?: boolean
	currentPlan?: string
	planTier?: string
	usageStats?: {
		properties?: number
		tenants?: number
		leases?: number
		maintenance?: number
		uptime?: string
		monthlyRevenue?: number
		activeLeases?: number
	}
	billingInfo?: {
		nextBillingDate?: string
		billingAmount?: number
		billingCycle?: string
		lastPayment?: string
		paymentMethod?: string
	}
	testimonial?: {
		quote?: string
		text?: string
		author?: string
		company?: string
		rating?: number
	}
}

export interface PaginationLinkProps {
	page: number
	currentPage: number
	onPageChange: (page: number) => void
	isActive?: boolean
	size?: string
	className?: string
	children: React.ReactNode
}

export interface VirtualizedListProps<T> {
	items: T[]
	renderItem: (item: T, index: number) => React.ReactNode
	getItemKey: (item: T, index: number) => string | number
	itemHeight?: number
	containerHeight?: number
	height?: number
	estimateSize?: number | ((index: number) => number)
	gap?: number
	overscan?: number
	onScrollToEnd?: () => void
	className?: string
}

export type ButtonVariant =
	| 'primary'
	| 'secondary'
	| 'outline'
	| 'ghost'
	| 'destructive'

export type BadgeVariant =
	| 'default'
	| 'secondary'
	| 'destructive'
	| 'success'
	| 'warning'
	| 'outline'

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'

export type AnimationType =
	| 'fade-in'
	| 'slide-up'
	| 'slide-down'
	| 'scale'
	| 'bounce'
	| 'pulse'

export type BadgeSize = 'sm' | 'default' | 'lg'

export interface GridColumnsConfig {
	default?: number
	xs?: number
	sm?: number
	md?: number
	lg?: number
	xl?: number
	'2xl'?: number
}

export interface ResponsiveValuesConfig {
	default?: string | number
	xs?: string | number
	sm?: string | number
	md?: string | number
	lg?: string | number
	xl?: string | number
	'2xl'?: string | number
}

export type UnitRow = Database['public']['Tables']['unit']['Row'] & {
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
		startDate: string
		endDate: string
		rentAmount: number
		status: Database['public']['Enums']['LeaseStatus']
	} | null
	// Optional enhancement fields for UI display
	marketValue?: number
	lastUpdated?: string
}

export type MaintenanceRequestRow =
	Database['public']['Tables']['maintenance_request']['Row'] & {
		property: { name: string } | null
		unit: { name: string } | null
		assignedTo: { name: string } | null
	}

// Re-export auth form types for frontend components
export type { AuthFormProps, LoginFormData, SignupFormData } from './auth.js'
