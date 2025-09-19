/**
 * Frontend-specific types that don't fit in core.ts
 * These are UI component and frontend utility types
 */

import type * as React from 'react'
import type { Property, Tenant } from './core'

// THEME TYPES

export interface SVGPatternProps {
	id: string
	width?: number
	height?: number
	patternUnits?: 'userSpaceOnUse' | 'objectBoundingBox'
	children?: React.ReactNode
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
	status: 'ok' | 'error'
	timestamp: string
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

// PRICING/STRIPE TYPES

export interface CheckoutFormProps {
	planId: string
	interval: 'month' | 'year'
	onSuccess?: () => void
	onCancel?: () => void
	className?: string
}

export interface CreatePaymentIntentRequest {
	amount: number
	currency: string
	description?: string
	customerId?: string
	metadata?: Record<string, string>
}

export interface CustomerPortalCardProps {
	title: string
	description: string
	icon: React.ComponentType<{ className?: string }>
	actionText: string
	onAction: () => void
	disabled?: boolean
}

// PAGINATION TYPES

export interface PaginationLinkProps {
	page: number
	currentPage: number
	onPageChange: (page: number) => void
	className?: string
	children: React.ReactNode
}

// VIRTUALIZED LIST TYPES

export interface VirtualizedListProps<T> {
	items: T[]
	renderItem: (item: T, index: number) => React.ReactNode
	getItemKey: (item: T) => string | number
	itemHeight: number
	containerHeight: number
	className?: string
}

export interface VirtualizedPropertyListProps {
	properties: Property[]
	onPropertySelect?: (property: Property) => void
	className?: string
}

export interface VirtualizedTenantListProps {
	tenants: Tenant[]
	onTenantSelect?: (tenant: Tenant) => void
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
	xs?: number
	sm?: number
	md?: number
	lg?: number
	xl?: number
	'2xl'?: number
}

export interface ResponsiveValuesConfig {
	xs?: string | number
	sm?: string | number
	md?: string | number
	lg?: string | number
	xl?: string | number
	'2xl'?: string | number
}
