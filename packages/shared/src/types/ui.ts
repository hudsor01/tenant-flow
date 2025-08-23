/**
 * UI and Design System Types
 *
 * Comprehensive type definitions for the TenantFlow design system,
 * including component props, variants, themes, accessibility, and layout types.
 */

import type { VariantProps } from 'class-variance-authority'

// Framework-agnostic types for shared package compatibility
type ReactNode = unknown
type AriaAttributes = Record<string, unknown>
type KeyboardEvent = Event
type ElementType = string

// ============================================================================
// BASE UI TYPES
// ============================================================================

/**
 * Base props for all UI components
 */
export interface BaseUIProps {
	/** Custom CSS class names */
	className?: string
	/** Unique identifier */
	id?: string
	/** Test identifier for automation */
	'data-testid'?: string
}

/**
 * Props for components that can contain children
 */
export type WithChildren<
	T extends Record<string, unknown> = Record<string, unknown>
> = T & {
	children?: ReactNode
}

/**
 * Props for polymorphic components that can render as different elements
 */
export interface AsChildProps<T extends ElementType = ElementType> {
	/** Render component as a different element */
	asChild?: boolean
	/** Element type when using asChild */
	as?: T
}

// ============================================================================
// DESIGN TOKEN TYPES
// ============================================================================

/**
 * Color system types based on CSS custom properties
 */
export interface ColorTokens {
	// Primary brand colors
	primary: string
	'primary-foreground': string
	'primary-hover': string

	// Secondary colors
	secondary: string
	'secondary-foreground': string
	'secondary-hover': string

	// Semantic colors
	success: string
	'success-foreground': string
	warning: string
	'warning-foreground': string
	destructive: string
	'destructive-foreground': string

	// Neutral colors
	background: string
	foreground: string
	muted: string
	'muted-foreground': string
	card: string
	'card-foreground': string
	border: string
	input: string
	ring: string

	// Accent colors
	accent: string
	'accent-foreground': string
	simplify: string
}

/**
 * Spacing system based on rem units
 */
export type SpacingToken =
	| 'xs'
	| 'sm'
	| 'md'
	| 'lg'
	| 'xl'
	| '2xl'
	| '3xl'
	| '4xl'
	| '0'
	| '1'
	| '2'
	| '3'
	| '4'
	| '6'
	| '8'
	| '12'
	| '16'
	| '20'
	| '24'
	| '32'

/**
 * Typography tokens
 */
export interface TypographyTokens {
	fontFamily: {
		sans: string[]
		mono: string[]
	}
	fontSize: {
		xs: string
		sm: string
		base: string
		lg: string
		xl: string
		'2xl': string
		'3xl': string
		'4xl': string
	}
	fontWeight: {
		normal: number
		medium: number
		semibold: number
		bold: number
	}
	lineHeight: {
		tight: number
		normal: number
		relaxed: number
	}
}

/**
 * Component size variants
 */
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Component color variants
 */
export type ColorVariant =
	| 'default'
	| 'primary'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'destructive'
	| 'outline'
	| 'ghost'
	| 'link'
	| 'accent'
	| 'muted'

// ============================================================================
// COMPONENT VARIANT TYPES
// ============================================================================

/**
 * Button variant types
 */
export interface ButtonVariants {
	variant?:
		| 'default'
		| 'destructive'
		| 'outline'
		| 'secondary'
		| 'ghost'
		| 'link'
		| 'gradient'
		| 'premium'
		| 'cta'
		| 'simplify'
		| 'success'
		| 'warning'
		| 'loading'
		| 'glass'
	size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg'
	fullWidth?: boolean
}

/**
 * Input variant types
 */
export interface InputVariants {
	variant?: 'default' | 'filled' | 'outline' | 'underline'
	size?: 'sm' | 'md' | 'lg'
	state?: 'default' | 'error' | 'success' | 'disabled'
}

/**
 * Card variant types
 */
export interface CardVariants {
	variant?:
		| 'default'
		| 'elevated'
		| 'interactive'
		| 'accent'
		| 'gradient'
		| 'glass'
		| 'highlight'
		| 'premium'
	size?: 'sm' | 'md' | 'lg' | 'xl'
	spacing?: 'compact' | 'comfortable' | 'spacious'
}

/**
 * Badge variant types
 */
export interface BadgeVariants {
	variant?:
		| 'default'
		| 'secondary'
		| 'success'
		| 'warning'
		| 'error'
		| 'outline'
		| 'gradient'
	size?: 'sm' | 'md' | 'lg'
}

// ============================================================================
// LAYOUT AND GRID TYPES
// ============================================================================

/**
 * Container size options
 */
export type ContainerSize =
	| 'sm'
	| 'md'
	| 'lg'
	| 'xl'
	| '2xl'
	| '4xl'
	| '6xl'
	| '7xl'
	| 'full'

/**
 * Grid column configurations
 */
export type GridCols = 1 | 2 | 3 | 4 | 'auto'

/**
 * Flexbox alignment options
 */
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch'
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around'
export type FlexDirection = 'row' | 'column'

/**
 * Layout spacing options
 */
export type LayoutSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// ============================================================================
// FORM COMPONENT TYPES
// ============================================================================

/**
 * Form field state
 */
export interface FormFieldState {
	value?: unknown
	error?: string
	touched?: boolean
	dirty?: boolean
	valid?: boolean
}

/**
 * Form validation result
 */
export interface ValidationResult {
	isValid: boolean
	errors: Record<string, string>
}

/**
 * Form step for multi-step forms
 */
export interface FormStep {
	id: string
	title: string
	description?: string
	fields: string[]
	optional?: boolean
}

/**
 * Form field props interface
 */
export interface FormFieldProps extends BaseUIProps {
	name: string
	label?: string
	placeholder?: string
	description?: string
	error?: string
	required?: boolean
	disabled?: boolean
}

// ============================================================================
// ACCESSIBILITY TYPES
// ============================================================================

/**
 * ARIA live region politeness levels
 */
export type AriaLive = 'off' | 'polite' | 'assertive'

/**
 * ARIA autocomplete options
 */
export type AriaAutoComplete = 'none' | 'inline' | 'list' | 'both'

/**
 * Enhanced accessibility props
 */
export interface AccessibilityProps extends AriaAttributes {
	/** Screen reader only text */
	'aria-label'?: string
	/** References to describing elements */
	'aria-describedby'?: string
	/** References to labeling elements */
	'aria-labelledby'?: string
	/** Indicates if element is required */
	'aria-required'?: boolean
	/** Indicates if element has validation error */
	'aria-invalid'?: boolean
	/** Live region announcement level */
	'aria-live'?: AriaLive
	/** Expanded state for collapsible elements */
	'aria-expanded'?: boolean
	/** Hidden state for screen readers */
	'aria-hidden'?: boolean
	/** Current state in a set */
	'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
}

/**
 * Keyboard navigation props
 */
export interface KeyboardNavigationProps {
	/** Handle arrow key navigation */
	onArrowKey?: (direction: 'up' | 'down' | 'left' | 'right') => void
	/** Handle escape key */
	onEscape?: () => void
	/** Handle enter key */
	onEnter?: () => void
	/** Handle space key */
	onSpace?: () => void
	/** Handle tab key */
	onTab?: (event: KeyboardEvent) => void
}

/**
 * Focus management props
 */
export interface FocusManagementProps {
	/** Auto-focus on mount */
	autoFocus?: boolean
	/** Focus trap for modals/dialogs */
	trapFocus?: boolean
	/** Restore focus on unmount */
	restoreFocus?: boolean
	/** Focus target selector */
	focusTarget?: string
}

// ============================================================================
// ANIMATION AND MOTION TYPES
// ============================================================================

/**
 * Animation duration presets
 */
export type AnimationDuration = 'fast' | 'normal' | 'slow'

/**
 * Animation easing presets
 */
export type AnimationEasing =
	| 'linear'
	| 'ease'
	| 'ease-in'
	| 'ease-out'
	| 'ease-in-out'

/**
 * Motion variant types
 */
export interface MotionVariants {
	/** Initial animation state */
	initial?: Record<string, unknown>
	/** Animate to state */
	animate?: Record<string, unknown>
	/** Exit animation state */
	exit?: Record<string, unknown>
	/** Hover animation state */
	hover?: Record<string, unknown>
	/** Tap animation state */
	tap?: Record<string, unknown>
}

// ============================================================================
// ICON AND ASSET TYPES
// ============================================================================

/**
 * Icon size options
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Icon component props
 */
export interface IconProps extends BaseUIProps {
	size?: IconSize
	color?: string
	'aria-hidden'?: boolean
	'aria-label'?: string
}

/**
 * Image loading states
 */
export type ImageLoadingState = 'idle' | 'loading' | 'loaded' | 'error'

// ============================================================================
// THEME AND CUSTOMIZATION TYPES
// ============================================================================

/**
 * Theme mode
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Theme configuration
 */
export interface ThemeConfig {
	mode: ThemeMode
	colors: Partial<ColorTokens>
	typography: Partial<TypographyTokens>
	spacing: Record<string, string>
	borderRadius: Record<string, string>
	shadows: Record<string, string>
}

/**
 * Custom CSS properties for theming
 */
export type CSSCustomProperties = Record<`--${string}`, string | number>

// ============================================================================
// COMPONENT-SPECIFIC TYPES
// ============================================================================

/**
 * Data table column definition
 */
export interface DataTableColumn<T = unknown> {
	id: string
	header: string
	accessor: keyof T | ((row: T) => unknown)
	sortable?: boolean
	filterable?: boolean
	width?: number | string
	align?: 'left' | 'center' | 'right'
}

/**
 * Toast notification types
 */
export interface ToastNotification {
	id: string
	type: 'success' | 'error' | 'warning' | 'info'
	title?: string
	message: string
	duration?: number
	action?: {
		label: string
		onClick: () => void
	}
}

/**
 * Modal/Dialog types
 */
export interface ModalProps extends BaseUIProps, AccessibilityProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	modal?: boolean
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

/**
 * Dropdown menu item
 */
export interface DropdownMenuItem {
	id: string
	label: string
	icon?: ReactNode
	disabled?: boolean
	destructive?: boolean
	onClick?: () => void
	href?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract variant props from a component
 */
export type ExtractVariantProps<T> = T extends VariantProps<infer U> ? U : never

/**
 * Make all properties optional except specified ones
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

/**
 * Merge component props with HTML attributes
 * @template T - Element type (unused but required for type compatibility)
 * @template P - Component props
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ComponentProps<T extends ElementType, P = object> = P &
	Record<string, unknown>

/**
 * Polymorphic component props
 */
export type PolymorphicProps<
	T extends ElementType,
	P = object
> = ComponentProps<T, P & { as?: T }>

// ============================================================================
// RESPONSIVE DESIGN TYPES
// ============================================================================

/**
 * Breakpoint names
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/**
 * Responsive value type
 */
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>

/**
 * Media query helpers
 */
export interface MediaQueries {
	up: (breakpoint: Breakpoint) => string
	down: (breakpoint: Breakpoint) => string
	between: (min: Breakpoint, max: Breakpoint) => string
	only: (breakpoint: Breakpoint) => string
}

// ============================================================================
// PERFORMANCE AND OPTIMIZATION TYPES
// ============================================================================

/**
 * Lazy loading state
 */
export interface LazyLoadState {
	isIntersecting: boolean
	hasLoaded: boolean
	error?: Error
}

/**
 * Virtual list item
 */
export interface VirtualListItem {
	index: number
	data: unknown
	height?: number
	isVisible: boolean
}

// ============================================================================
// EXPORTS
// ============================================================================

// Framework-agnostic exports for convenience
export type { ReactNode, AriaAttributes, KeyboardEvent, ElementType }

// Design system component types
export interface DesignSystemComponents {
	Button: ButtonVariants
	Input: InputVariants
	Card: CardVariants
	Badge: BadgeVariants
}

// Complete design system interface
export interface DesignSystem {
	tokens: {
		colors: ColorTokens
		typography: TypographyTokens
		spacing: Record<SpacingToken, string>
	}
	components: DesignSystemComponents
	theme: ThemeConfig
	accessibility: AccessibilityProps
}
