/**
 * Frontend-specific types that don't fit in core.ts
 * These are UI component and frontend utility types
 */

import type { PlanId, PricingConfig } from '../config/pricing.js'
import type { Database, Property, Tenant } from './core.js'

// DASHBOARD COMPONENT TYPES
export interface AnimatedMetricCardProps {
	title: string
	value: number
	formatValue: (value: number) => string
	borderColor: string
	textColor: string
	trend: string
	description: string
	icon: React.ReactNode
	delay?: number
}

// Note: MetricsCardProps moved to frontend-ui.ts to avoid duplicate exports

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

export interface EnhancedMetricsCardProps
	extends React.HTMLAttributes<HTMLDivElement> {
	title: string
	value: string | number
	description?: string
	change?: {
		value: string
		trend: TrendDirection
		period?: string
	}
	progress?: {
		current: number
		target: number
		label?: string
	}
	sparkline?: SparklineData[]
	icon?: React.ComponentType<{ className?: string }>
	colorVariant: ColorVariant
	showTrendIcon?: boolean
	lastUpdated?: string
	interactive?: boolean
	size?: 'sm' | 'md' | 'lg'
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

export type PageType =
	| 'dashboard'
	| 'properties'
	| 'leases'
	| 'tenants'
	| 'maintenance'
	| 'unknown'

// UI STORE TYPES (Legacy - Removed)
// Modals → Use component-local useState or URL state (nuqs)
// Notifications → Use Sonner toast library
// Loading → Use TanStack Query or component-local useState
// Refresh Triggers → Use TanStack Query invalidation

// Note: ErrorContext and UserFriendlyError moved to frontend-ui.ts to avoid duplicate exports
export type { ErrorType } from './api'

// AUTH FORM TYPES - Re-export from auth.ts (primary source)
export type { AuthFormProps } from './auth.js'

// THEME TYPES

export interface SVGPatternProps {
	id: string
	width?: number
	height?: number
	patternUnits?: 'userSpaceOnUse' | 'objectBoundingBox'
	children?: React.ReactNode
}

export interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
	width?: number
	height?: number
	x?: number
	y?: number
	cx?: number
	cy?: number
	cr?: number
	className?: string
	glow?: boolean
	[key: string]: unknown
}

export interface ThemeColors {
	primary: string
	secondary: string
	accent: string
	background: string
	surface: string
	text: string
	textSecondary: string
	border: string
	success: string
	warning: string
	error: string
	info: string
}

export interface ThemeRadius {
	sm: string
	md: string
	lg: string
	xl: string
	'2xl': string
	full: string
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
	| 'purple'
	| 'fuchsia'
	| 'pink'
	| 'rose'

export type TailwindRadiusValue = 0 | 0.3 | 0.5 | 0.65 | 0.75 | 1.0

export interface ThemeCSSVariables {
	'--background': string
	'--foreground': string
	'--card': string
	'--card-foreground': string
	'--popover': string
	'--popover-foreground': string
	'--primary': string
	'--primary-foreground': string
	'--secondary': string
	'--secondary-foreground': string
	'--muted': string
	'--muted-foreground': string
	'--accent': string
	'--accent-foreground': string
	'--destructive': string
	'--destructive-foreground': string
	'--border': string
	'--input': string
	'--ring': string
	'--radius': string
	'--chart-1': string
	'--chart-2': string
	'--chart-3': string
	'--chart-4': string
	'--chart-5': string
	[key: string]: string
}

// HEALTH CHECK TYPES

export interface FrontendHealthCheckResponse {
	status: 'ok' | 'error' | 'unhealthy'
	timestamp: string
	checks?: Record<string, boolean>
	services: Array<{
		name: string
		status: 'healthy' | 'degraded' | 'down'
		responseTime?: number
		lastCheck: string
	}>
	version: string
	environment: string
}

// FINANCE/REVENUE TYPES

export interface RevenueDataPoint {
	date: string
	amount: number
	type: 'income' | 'expense' | 'scheduled'
	category?: string
	description?: string
}

// Chart-specific revenue data point for revenue-trend-chart
export interface RevenueChartDataPoint {
	month: string
	revenue: number
	recurring: number
	oneTime: number
	projected?: number
}

// CHART COMPONENT TYPES

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

// PRICING/STRIPE TYPES

export interface CheckoutFormProps {
	planId: string
	interval: 'month' | 'year'
	onSuccess?: () => void
	onCancel?: () => void
	className?: string
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

// PAGINATION TYPES

export interface PaginationLinkProps {
	page: number
	currentPage: number
	onPageChange: (page: number) => void
	isActive?: boolean
	size?: string
	className?: string
	children: React.ReactNode
}

// VIRTUALIZED LIST TYPES

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

export interface VirtualizedPropertyListProps {
	properties: Property[]
	onPropertySelect?: (property: Property) => void
	onPropertyClick?: (propertyId: string) => void
	height?: number
	className?: string
}

export interface VirtualizedTenantListProps {
	tenants: Tenant[]
	onTenantSelect?: (tenant: Tenant) => void
	onTenantClick?: (tenantId: string) => void
	height?: number
	className?: string
}

// DATA TABLE TYPES

export interface UseDataTableInstanceProps<T> {
	data: T[]
	columns: Array<{
		key: keyof T
		title: string
		render?: (value: unknown, item: T) => React.ReactNode
		sortable?: boolean
	}>
	defaultSort?: {
		key: keyof T
		direction: 'asc' | 'desc'
	}
	onSort?: (key: keyof T, direction: 'asc' | 'desc') => void
}

export interface DataTableProps<T> {
	data: T[]
	columns: unknown[]
	enableRowSelection?: boolean
	defaultPageIndex?: number
	defaultPageSize?: number
	getRowId?: (row: T) => string
}

// DESIGN SYSTEM TYPES

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

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending'

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

// PRICING UI TYPES

export interface PricingUIData {
	icon: React.ComponentType<{ className?: string }>
	popular: boolean
	tier: string
	tagline: string
	enhanced_features: Array<{ text: string; highlight: boolean }>
	benefits: string[]
	cta: string
	highlight: string
	monthlySavings: number
	yearlySavings: number
	savingsPercentage: number
	formattedPrice: string
	fullYearPrice: string
}

// SIDEBAR TYPES

export interface SidebarContextProps {
	state: 'expanded' | 'collapsed'
	open: boolean
	setOpen: (open: boolean) => void
	openMobile: boolean
	setOpenMobile: (open: boolean) => void
	isMobile: boolean
	toggleSidebar: () => void
}

// SHIMMER BUTTON TYPES

export interface ShimmerButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	shimmerColor?: string
	shimmerSize?: string
	shimmerDuration?: string
	background?: string
	variant?:
		| 'primary'
		| 'secondary'
		| 'accent'
		| 'success'
		| 'warning'
		| 'danger'
	size?: 'sm' | 'md' | 'lg'
	radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
	intensity?: 'subtle' | 'normal' | 'intense'
	reducedMotion?: boolean
	icon?: React.ReactNode
	iconPosition?: 'left' | 'right'
	asChild?: boolean
}

// PRICING HOOK TYPES

export interface UsePricingReturn {
	plans: Array<PricingConfig>
	isLoading: boolean
	error: string | null
	getPlan: (planId: PlanId) => PricingConfig | undefined
	getPrice: (planId: PlanId, period: 'monthly' | 'annual') => string
	getStripeId: (planId: PlanId, period: 'monthly' | 'annual') => string | null
}

// DATA TABLE ROW TYPES - Extended database types for UI display

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
