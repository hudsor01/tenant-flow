/**
 * Frontend-specific types for TenantFlow
 * These types are used by the frontend application and TailAdmin components
 */

// Calendar Event Types
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

// Modal Hook Types
export interface UseModalReturn {
	isOpen: boolean
	openModal: () => void
	closeModal: () => void
	toggleModal: () => void
}

// Theme Context Types
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
	theme: Theme
	setTheme: (theme: Theme) => void
	toggleTheme: () => void
}

// Sidebar Context Types
export interface SidebarContextType {
	isOpen: boolean
	setIsOpen: (isOpen: boolean) => void
	toggleSidebar: () => void
}

// Icon Component Types (for TailAdmin icons)
export interface IconProps {
	className?: string
	size?: number | string
	color?: string
}

// Form Types
export interface FormFieldError {
	type: string
	message: string
}

export interface FormState {
	isSubmitting: boolean
	isValid: boolean
	errors: Record<string, FormFieldError>
}

// Dashboard Stats Types
export interface DashboardStat {
	title: string
	value: string | number
	change?: number
	changeType?: 'increase' | 'decrease'
	icon?: unknown // Generic component type - frontend will cast appropriately
}

// Map Component Types
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

// Chart Types
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

// App Store Types
export interface UIPreferences {
	theme: Theme
	sidebarOpen: boolean
	compactMode: boolean
	showWelcome: boolean
	language: string
	timezone: string
}

export interface UserSession {
	user: Record<string, unknown> | null
	isAuthenticated: boolean
	lastActivity: Date | null
	sessionExpiry: Date | null
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
