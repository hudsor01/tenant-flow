/**
 * Frontend-specific types for TenantFlow
 * These types are used by the frontend application and TailAdmin components
 */

import type { ThemeMode } from './domain'

// Component and React types without React dependency
export type ComponentType<P = Record<string, unknown>> = (props: P) => unknown
export type SVGProps<_T = unknown> = Record<string, unknown>
export type ReactNodeType = unknown

// Icon Component Types - React 19 compatible typing for icon components
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
export type IconIdentifier = string
export type IconType = IconComponent | IconIdentifier

// SVG Component Props - For animated patterns and graphics components
export interface SVGPatternProps
	extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'x' | 'y'> {
	width?: number | string
	height?: number | string
	x?: number | string
	y?: number | string
	className?: string
}

export interface GridPatternItem {
	id: number
	pos: [number, number]
}

export interface CalendarEvent {
	id?: string
	title: string
	start: Date | string
	end?: Date | string
	allDay?: boolean
	extendedProps?: {
		calendar?: string
		description?: string
		location?: string
		attendees?: string[]
		color?: string
		[key: string]: string | string[] | undefined
	}
}

export interface UseModalReturn {
	isOpen: boolean
	openModal: () => void
	closeModal: () => void
	toggleModal: () => void
}

export const THEME_MODE_OPTIONS = [
	{
		label: 'Light',
		value: 'light'
	},
	{
		label: 'Dark',
		value: 'dark'
	}
] as const

export const THEME_MODE_VALUES = THEME_MODE_OPTIONS.map(m => m.value)
// ThemeMode is imported from './domain'

export type ThemeColors =
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

export type ThemeRadius = 0 | 0.3 | 0.5 | 0.65 | 0.75 | 1.0

export interface ThemeColorStateParams {
	themeColor: ThemeColors
	setThemeColor: (color: ThemeColors) => void
	themeRadius: ThemeRadius
	setThemeRadius: (radius: ThemeRadius) => void
}

export interface ThemeProviderProps {
	children: ReactNodeType // React 19 compatible children
	defaultTheme?: ThemeColors
	defaultRadius?: ThemeRadius
	storageKey?: string
}

export interface ThemeCSSVariables {
	'--radius': string
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
	'--chart-1': string
	'--chart-2': string
	'--chart-3': string
	'--chart-4': string
	'--chart-5': string
	'--sidebar': string
	'--sidebar-foreground': string
	'--sidebar-primary': string
	'--sidebar-primary-foreground': string
	'--sidebar-accent': string
	'--sidebar-accent-foreground': string
	'--sidebar-border': string
	'--sidebar-ring': string
}

export interface ThemePreset {
	name: string
	label: string
	cssClass: string
	light: ThemeCSSVariables
	dark: ThemeCSSVariables
}

export const THEME_PRESET_OPTIONS = [
	{
		label: 'Default',
		value: 'default',
		primary: {
			light: 'oklch(0.205 0 0)',
			dark: 'oklch(0.922 0 0)'
		}
	}
] as const

export const THEME_PRESET_VALUES = THEME_PRESET_OPTIONS.map(p => p.value)
export type ThemePresetValue = (typeof THEME_PRESET_OPTIONS)[number]['value']

export interface ThemeContextType {
	theme: ThemeMode
	setTheme: (theme: ThemeMode) => void
	toggleTheme: () => void
}

export const SIDEBAR_VARIANT_OPTIONS = [
	{ label: 'Inset', value: 'inset' },
	{ label: 'Sidebar', value: 'sidebar' },
	{ label: 'Floating', value: 'floating' }
] as const
export const SIDEBAR_VARIANT_VALUES = SIDEBAR_VARIANT_OPTIONS.map(v => v.value)
export type SidebarVariant = (typeof SIDEBAR_VARIANT_VALUES)[number]

export const SIDEBAR_COLLAPSIBLE_OPTIONS = [
	{ label: 'Icon', value: 'icon' },
	{ label: 'Offcanvas', value: 'offcanvas' }
] as const
export const SIDEBAR_COLLAPSIBLE_VALUES = SIDEBAR_COLLAPSIBLE_OPTIONS.map(
	v => v.value
)
export type SidebarCollapsible = (typeof SIDEBAR_COLLAPSIBLE_VALUES)[number]

export const CONTENT_LAYOUT_OPTIONS = [
	{ label: 'Centered', value: 'centered' },
	{ label: 'Full Width', value: 'full-width' }
] as const
export const CONTENT_LAYOUT_VALUES = CONTENT_LAYOUT_OPTIONS.map(v => v.value)
export type ContentLayout = (typeof CONTENT_LAYOUT_VALUES)[number]

export interface SidebarContextType {
	isOpen: boolean
	setIsOpen: (isOpen: boolean) => void
	toggleSidebar: () => void
}

export interface IconProps {
	className?: string
	size?: number | string
	color?: string
}

export interface FormFieldError {
	type: string
	message: string
}

export interface FrontendFormState {
	isSubmitting: boolean
	isValid: boolean
	errors: Record<string, FormFieldError>
}

export interface DashboardStat {
	title: string
	value: string | number
	change?: number
	changeType?: 'increase' | 'decrease'
	icon?: IconType // Proper union type for React components and string identifiers
}

export interface MapMarker {
	name: string
	coords: [number, number]
	value?: number
}

export interface MapConfig {
	backgroundColor?: string
	zoomOnScroll?: boolean
	zoomMax?: number
	zoomMin?: number
	zoomAnimate?: boolean
	zoomStep?: number
}

export interface ChartDataPoint {
	name: string
	value: number
	label?: string
	category?: string
	percentage?: number
	color?: string
	[key: string]: string | number | undefined
}

export interface ChartConfig {
	data: ChartDataPoint[]
	xKey?: string
	yKey?: string
	color?: string
	height?: number
}

export interface UIPreferences {
	theme: ThemeMode
	sidebarOpen: boolean
	compactMode: boolean
	showWelcome: boolean
	language: string
	timezone: string
}


export interface RecentActivity {
	id: string
	type: 'login' | 'payment' | 'lease' | 'tenant' | 'property' | 'maintenance'
	title: string
	description: string
	timestamp: string
	metadata?: Record<string, unknown>
}

export interface AppNotification {
	id: string
	type: 'info' | 'success' | 'warning' | 'error'
	title: string
	message: string
	timestamp: string
	read: boolean
	actionUrl?: string
	actionLabel?: string
	metadata?: Record<string, string>
}

// =============================================================================
// FRONTEND COMPONENT TYPES (moved from inline definitions)
// =============================================================================

// Finance component types
export interface RevenueDataPoint {
	month: string
	revenue: number
	recurring: number
	oneTime: number
	projected?: number
}

// Checkout form types
export interface CheckoutFormProps {
	amount: number
	currency?: string
	metadata?: Record<string, string>
	onSuccess?: (paymentIntent: unknown) => void
	onError?: (error: unknown) => void
	business?: {
		name: string
		logo?: string
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
	metadata: Record<string, string>
	customerEmail?: string
	setupFutureUsage?: 'off_session' | 'on_session'
}

// Frontend health check types (different from backend health check)
export interface FrontendHealthCheckResponse {
	status: 'healthy' | 'unhealthy'
	timestamp: string
	environment: string
	checks: {
		supabase_url: boolean
		supabase_key: boolean
	}
	error?: string
}

// MagicUI component types
export interface NumberTickerProps {
	value: number
	startValue?: number
	direction?: 'up' | 'down'
	delay?: number
	decimalPlaces?: number
	size?: string
	variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted'
	animationDuration?: number
	prefix?: string
	suffix?: string
	enableIntersectionObserver?: boolean
	className?: string
}

// Customer portal types
export interface CustomerPortalCardProps {
	className?: string
	showStats?: boolean
	showTestimonial?: boolean
	currentPlan?: string
	planTier?: 'starter' | 'professional' | 'enterprise' | 'ultimate'
	usageStats?: {
		properties: number
		tenants: number
		uptime: string
		monthlyRevenue?: number
		activeLeases?: number
	}
	billingInfo?: {
		nextBillingDate?: string
		lastPayment?: string
		paymentMethod?: string
	}
	testimonial?: {
		text: string
		author: string
		company: string
		rating: number
	}
}

// Pricing component types
export interface PricingUIData {
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
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

// Complex type aliases for UI components
export type PaginationLinkProps = {
	isActive?: boolean
	size?: "sm" | "default" | "lg" | "icon"
	className?: string
} & React.ComponentProps<"a">

// =============================================================================
// DESIGN SYSTEM TYPES (moved from design-system.ts)
// =============================================================================

// Button variant types
export type ButtonVariant =
	| 'primary'
	| 'secondary'
	| 'outline'
	| 'ghost'
	| 'destructive'

// Badge variant types
export type BadgeVariant =
	| 'default'
	| 'secondary'
	| 'destructive'
	| 'success'
	| 'warning'
	| 'outline'

// Container size types
export type ContainerSize =
	| 'sm'
	| 'md'
	| 'lg'
	| 'xl'
	| '2xl'
	| 'full'

// Animation duration types
export type AnimationDuration =
	| 'fast'
	| 'normal'
	| 'slow'
	| 'slower'
	| 'slowest'

// Progress loading types
export type ProgressClass = string

// Skeleton loading types
export type SkeletonClass = string

// =============================================================================
// ADDITIONAL DESIGN SYSTEM TYPES (moved from design-system.ts violations)
// =============================================================================

// Animation type for animation classes
export type AnimationType = 'fade-in' | 'slide-up' | 'slide-down' | 'scale' | 'bounce' | 'pulse'

// Status types for status indicators
export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending'

// Size types for badges and status indicators
export type BadgeSize = 'sm' | 'default' | 'lg'

// Grid columns configuration type
export type GridColumnsConfig = {
	default: number
	sm?: number
	md?: number
	lg?: number
	xl?: number
	'2xl'?: number
}

// Responsive values configuration type
export type ResponsiveValuesConfig = {
	default: string
	sm?: string
	md?: string
	lg?: string
	xl?: string
	'2xl'?: string
}

// =============================================================================
// VIRTUALIZED LIST TYPES (moved from frontend components)
// =============================================================================

// Generic virtualized list component props
export interface VirtualizedListProps<T> {
	items: T[]
	renderItem: (item: T, index: number) => ReactNodeType
	estimateSize: number
	className?: string
	height?: number
	gap?: number
	overscan?: number
	getItemKey?: (item: T, index: number) => string
	onScrollToEnd?: () => void
}

// Specialized virtualized list props for domain entities
export interface VirtualizedPropertyListProps {
	properties: Array<{
		id: string
		displayAddress: string
		displayType: string
		statusDisplay: string
		statusColor: string
	}>
	onPropertyClick?: (propertyId: string) => void
	className?: string
	height?: number
}

export interface VirtualizedTenantListProps {
	tenants: Array<{
		id: string
		displayName: string
		displayEmail: string
		displayPhone: string
		statusDisplay: string
		statusColor: string
		avatarInitials: string
	}>
	onTenantClick?: (tenantId: string) => void
	className?: string
	height?: number
}

// =============================================================================
// DATA TABLE TYPES (moved from frontend hooks)
// =============================================================================

// Generic data table instance props for TanStack Table
export interface UseDataTableInstanceProps<TData, _TValue> {
	data: TData[]
	columns: _TValue[] // ColumnDef from @tanstack/react-table (kept generic to avoid TanStack dependency)
	enableRowSelection?: boolean
	defaultPageIndex?: number
	defaultPageSize?: number
	getRowId?: (row: TData, index: number) => string
}
