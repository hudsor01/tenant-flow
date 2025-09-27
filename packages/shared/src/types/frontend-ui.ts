/**
 * FRONTEND UI COMPONENT TYPES
 *
 * Consolidated UI component interfaces from apps/frontend
 * Includes component props, form types, and UI-specific interfaces
 */

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { TenantWithLeaseInfo } from './core.js'
import type { Database } from './supabase-generated.js'

// COMMON UI COMPONENT PROPS

export interface ComponentPropsWithChildren {
	children: ReactNode
	className?: string
}

export interface ComponentSize {
	size?: 'sm' | 'default' | 'lg' | 'xl'
}

export interface ComponentVariant {
	variant?:
		| 'default'
		| 'primary'
		| 'secondary'
		| 'destructive'
		| 'outline'
		| 'ghost'
}

export interface LoadingState {
	isLoading?: boolean
	loadingText?: string
}

// AUTH FORM COMPONENTS

export interface ForgotPasswordModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export interface GoogleButtonProps extends LoadingState {
	disabled?: boolean
	onClick?: () => void
}

export interface PasswordInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string
	error?: string
	showStrength?: boolean
}

export interface PasswordStrengthProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string
	value?: string
}

export interface StrengthRule {
	id: string
	label: string
	regex: RegExp
	met: boolean
}

// CHART AND ANALYTICS COMPONENTS

export interface MetricsCardProps extends React.ComponentProps<'div'> {
	title: string
	value: string | number
	description?: string
	status?: string
	statusIcon?: React.ComponentType<{ className?: string }>
	icon: React.ComponentType<{ className?: string }>
	colorVariant:
		| 'success'
		| 'primary'
		| 'revenue'
		| 'property'
		| 'warning'
		| 'info'
	trend?: 'up' | 'down' | 'stable'
}

export interface PropertyInterestDataPoint {
	date: string
	interest: number
}

export interface PropertyInterestAnalyticsChartProps {
	timeRange?: '7d' | '30d' | '90d'
	className?: string
	data?: PropertyInterestDataPoint[]
}

// NAVIGATION COMPONENTS

export interface NavItem {
	name: string
	href: string
	icon?: ReactNode
	badge?: string | number
}

export interface NavbarProps extends React.ComponentProps<'nav'> {
	logo?: string
	navItems?: NavItem[]
	showAuth?: boolean
}

export interface PageLayoutProps extends React.ComponentProps<'div'> {
	showNavbar?: boolean
	containerClass?: string
	title?: string
	description?: string
}

// WEB VITALS AND PERFORMANCE

export interface WebVitalsMetrics {
	CLS?: Metric
	FCP?: Metric
	FID?: Metric
	LCP?: Metric
	TTFB?: Metric
}

export interface Metric {
	name: string
	value: number
	rating: 'good' | 'needs-improvement' | 'poor'
	delta?: number
}

// LEASE MANAGEMENT COMPONENTS

type Lease = Database['public']['Tables']['Lease']['Row']

export interface LeaseActionButtonsProps {
	lease: Lease
}

// BENTO GRID COMPONENTS

export interface BentoGridProps extends ComponentPropsWithoutRef<'div'> {
	children: ReactNode
	className?: string
}

export interface BentoCardProps extends ComponentPropsWithoutRef<'div'> {
	name: string
	className: string
	background: ReactNode
	Icon: React.ComponentType<{ className?: string }>
	description: string
	href: string
	cta: string
}

// ANIMATION COMPONENTS

export interface BlurFadeVariant {
	y?: number
	x?: number
	scale?: number
	opacity?: number
}

export interface BlurFadeProps extends ComponentPropsWithChildren {
	variant?: {
		hidden: BlurFadeVariant
		visible: BlurFadeVariant
	}
	duration?: number
	delay?: number
	inView?: boolean
}

export interface BorderBeamProps {
	className?: string
	size?: number
	duration?: number
	delay?: number
	colorFrom?: string
	colorTo?: string
}

export interface BorderGlowProps {
	children: React.ReactNode
	className?: string
	glowColor?: string
	glowSize?: number
}

// ERROR BOUNDARIES AND FALLBACKS

export interface ErrorBoundaryProps {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: { componentStack: string }) => void
}

export interface ErrorBoundaryState {
	hasError: boolean
	error?: Error
}

// FEATURES SECTION COMPONENTS

export interface FeaturesSectionDemoProps {
	variant?: 'default' | 'modern' | 'minimal'
	size?: ComponentSize['size']
	className?: string
}

export interface FeatureProps {
	title: string
	description: string
	icon?: ReactNode
	href?: string
}

// HERO AND GLOWING EFFECTS

export interface GlowingEffectProps {
	children: React.ReactNode
	className?: string
	glowColor?: string
	intensity?: 'low' | 'medium' | 'high'
}

export interface GridPatternProps extends React.SVGProps<SVGSVGElement> {
	width?: number
	height?: number
	x?: number
	y?: number
	squares?: Array<[x: number, y: number]>
	strokeDasharray?: string | number
}

export interface HeroHighlightProps {
	children: React.ReactNode
	className?: string
}

export interface HighlightProps {
	children: React.ReactNode
	className?: string
	color?: string
}

// LOADING COMPONENTS

export interface LoadingSpinnerProps {
	size?: 'sm' | 'default' | 'lg' | 'xl'
	variant?: 'default' | 'primary' | 'muted'
	className?: string
}

// MOUSE TRACKING AND INTERACTIONS

export interface MousePosition {
	x: number
	y: number
}

export interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
	gradientColor?: string
	gradientOpacity?: number
	borderRadius?: number
}

// NUMBER TICKER COMPONENT

export interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
	value: number
	startValue?: number
	duration?: number
	className?: string
}

// PARTICLES COMPONENT

export interface ParticleType {
	x: number
	y: number
	vx: number
	vy: number
	life: number
	maxLife: number
}

export interface ParticlesProps extends ComponentPropsWithChildren {
	quantity?: number
	staticity?: number
	ease?: number
	size?: number
	refresh?: boolean
	color?: string
	vx?: number
	vy?: number
	className?: string
}

// SEO AND META COMPONENTS

export interface SEOHeadProps {
	title?: string
	description?: string
	image?: string
	url?: string
	type?: 'website' | 'article'
	siteName?: string
}

// MAINTENANCE COMPONENTS

export interface DeleteMaintenanceButtonProps {
	maintenance: {
		id: string
		title: string
	}
	onSuccess?: () => void
}

export interface EditMaintenanceButtonProps {
	maintenance: {
		id: string
		title: string
		description: string
		priority: string
		status: string
		category?: string
	}
	onSuccess?: () => void
}

export interface StatusUpdateButtonProps {
	maintenance: {
		id: string
		status: string
		title: string
	}
	onSuccess?: () => void
}

// SECTION COMPONENTS

export interface BentoGridAltProps {
	className?: string
	children?: ReactNode
}

export interface ContactFormProps {
	className?: string
	onSubmit?: (data: Record<string, unknown>) => void
}

export interface ContentSectionProps {
	className?: string
	title?: string
	subtitle?: string
	children?: ReactNode
}

export interface CtaSectionProps {
	className?: string
	title?: string
	description?: string
	primaryButton?: {
		text: string
		href: string
	}
	secondaryButton?: {
		text: string
		href: string
	}
}

export interface FeaturesGridProps {
	className?: string
	features?: FeatureProps[]
}

export interface HeroAuthorityProps
	extends Omit<React.ComponentProps<'section'>, 'title'> {
	title: React.ReactNode
	subtitle?: React.ReactNode
	description?: React.ReactNode
	primaryAction?: {
		text: string
		href: string
	}
	secondaryAction?: {
		text: string
		href: string
	}
}

export type SectionSize = 'sm' | 'md' | 'lg' | 'xl'
export type SectionBackground = 'none' | 'authority' | 'professional'

export interface SectionProps extends React.ComponentProps<'section'> {
	size?: SectionSize
	background?: SectionBackground
	containerClass?: string
}

// CHECKOUT AND PRICING COMPONENTS

export interface CheckoutProps {
	className?: string
	priceId?: string
	planName?: string
}

export interface ExtendedCustomerPortalCardProps {
	className?: string
	title?: string
	description?: string
	features?: string[]
}

export interface StripePricingSectionProps {
	className?: string
	showStats?: boolean
	variant?: 'default' | 'minimal' | 'featured'
}

// PROPERTY MANAGEMENT COMPONENTS

type Property = Database['public']['Tables']['Property']['Row']

export interface PropertyActionsProps {
	property: Property
}

// PROVIDER COMPONENTS

export interface ViewTransitionsProviderProps {
	children: ReactNode
}

export interface ProvidersProps {
	children: ReactNode
	initialThemeMode?: 'light' | 'dark' | 'system'
}

// ENTERPRISE AND TESTIMONIALS

export interface EnterpriseHeroSectionProps {
	className?: string
	title?: string
	subtitle?: string
	features?: string[]
}

export interface FAQItemProps {
	question: string
	answer: string
	defaultOpen?: boolean
}

export interface StatsProps extends React.ComponentProps<'section'> {
	showFeatures?: boolean
	variant?: 'default' | 'minimal' | 'featured'
	stats?: Array<{
		value: string
		label: string
		description?: string
	}>
}

export interface TestimonialsMinimalProps
	extends React.ComponentProps<'section'> {
	showTrustIndicators?: boolean
	testimonials?: Array<{
		content: string
		author: string
		role: string
		company?: string
		avatar?: string
	}>
}

// TENANT MANAGEMENT COMPONENTS

export interface AddTenantDialogProps {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onSuccess?: () => void
}

export interface TenantActionButtonsProps {
	tenant: TenantWithLeaseInfo
}

// DATA TABLE COMPONENTS (Frontend-specific)

export interface FrontendDataTableProps<TData, _TValue> {
	columns: Array<{
		id: string
		header: string
		cell?: (props: { getValue: () => unknown }) => ReactNode
	}>
	data: TData[]
	searchable?: boolean
	searchPlaceholder?: string
	className?: string
}

// UNIT MANAGEMENT COMPONENTS

type UnitRow = Database['public']['Tables']['Unit']['Row']

export interface UnitViewDialogProps {
	unit: UnitRow
	open: boolean
	onOpenChange: (open: boolean) => void
}

export interface UnitEditDialogProps {
	unit: UnitRow
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

export interface SortableHeaderProps {
	column: { id: string; header: string; sortable?: boolean }
	children: React.ReactNode
}

export interface UnitActionsProps {
	unit: UnitRow
}

// COLOR AND DESIGN SYSTEM

export interface ContrastResult {
	ratio: number
	isAccessible: boolean
}

export interface ColorPair {
	foreground: string
	background: string
}

// FORM DRAFT STATE

export interface FormDraftState {
	data: Record<string, unknown> | null
	sessionId: string | null
}

// QUERY AND DATA FETCHING

export interface UseInfiniteQueryProps<
	T extends keyof Database['public']['Tables']
> {
	tableName: T
	columns?: string
	filters?: Record<string, unknown>
	orderBy?: string
	pageSize?: number
}

export interface InfiniteQueryPage<TData> {
	data: TData[]
	count: number
	hasMore: boolean
}

// API AUTH RESULT

export interface ApiAuthResult {
	user: Database['public']['Tables']['User']['Row'] | null
	error?: string
}

// Note: Error handling types moved to errors.ts to avoid duplicate exports

// RATE LIMITING (FRONTEND)

export interface RateLimitOptions {
	windowMs: number // Time window in milliseconds
	maxRequests: number // Maximum requests per window
	keyExtractor?: (request: { ip?: string; userId?: string }) => string
}

// CHECKOUT SESSION TYPES (Frontend-specific)

export interface FrontendValidatedCheckoutData {
	planId: 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
	interval: 'monthly' | 'annual'
}

export interface FrontendCreateCheckoutSessionRequest {
	priceId: string
	planName: string
}

export interface FrontendCreateCheckoutSessionResponse {
	sessionId: string
	url: string
}

// GLOBAL WINDOW INTERFACE - Removed to avoid conflicts with existing definitions

export interface PostHogClientProviderProps {
	children: ReactNode
}

// PROVIDER INTERFACES

export interface QueryProviderProps {
	children: ReactNode
}

export interface StripeProviderProps {
	children: React.ReactNode
	priceId?: string
}

export interface PreferencesProviderProps {
	children: ReactNode
	themeMode: 'light' | 'dark' | 'system'
}

// STRIPE TYPES (FRONTEND)

export interface SubscriptionData {
	id: string
	status: 'active' | 'canceled' | 'incomplete' | 'past_due'
	current_period_end: number
	plan?: {
		id: string
		name: string
		amount: number
	}
}

export interface StripeEnvironmentConfig {
	publishableKey: string
	webhookSecret?: string
}

// TEST SCENARIO INTERFACES

export interface TestScenario {
	name: string
	description: string
	steps: string[]
	expectedResult: string
}

export interface ConsoleMessage {
	type: string
	text: string
	timestamp: number
}

export interface ConsoleLog {
	type: string
	text: string
	level: 'info' | 'warn' | 'error' | 'debug'
}

export interface PageWithConsole {
	consoleLogs: ConsoleLog[]
	errors: string[]
	warnings: string[]
}

// TEST PROPERTY INTERFACE

export interface TestProperty
	extends Omit<Property, 'id' | 'createdAt' | 'updatedAt'> {
	id?: string
	createdAt?: string
	updatedAt?: string
}

// FORM VALIDATION SCHEMAS

export interface FormSchemaProps {
	required?: boolean
	minLength?: number
	maxLength?: number
	pattern?: RegExp
	custom?: (value: unknown) => boolean | string
}

// Frontend UI types complete
