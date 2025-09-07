/**
 * Frontend-specific types for TenantFlow
 * These types are used by the frontend application and TailAdmin components
 */

import type { ComponentType, SVGProps, ReactNode } from 'react'

// Icon Component Types - React 19 compatible typing for icon components
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
export type IconIdentifier = string  
export type IconType = IconComponent | IconIdentifier

// SVG Component Props - For animated patterns and graphics components
export interface SVGPatternProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'x' | 'y'> {
  width?: number | string
  height?: number | string
  x?: number | string
  y?: number | string
  className?: string
}

// Grid Pattern Specific Props
export interface GridPatternItem {
  id: number
  pos: [number, number]
}

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

// ========================
// COMPREHENSIVE THEME SYSTEM - Consolidated from frontend theme conflicts
// ========================

// Theme Mode Types
export const THEME_MODE_OPTIONS = [
  {
    label: "Light",
    value: "light",
  },
  {
    label: "Dark", 
    value: "dark",
  },
] as const;

export const THEME_MODE_VALUES = THEME_MODE_OPTIONS.map((m) => m.value);
export type ThemeMode = (typeof THEME_MODE_VALUES)[number];

// Theme Color Types
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

// Theme State Management
export interface ThemeColorStateParams {
  themeColor: ThemeColors
  setThemeColor: (color: ThemeColors) => void
  themeRadius: ThemeRadius
  setThemeRadius: (radius: ThemeRadius) => void
}

export interface ThemeProviderProps {
  children: ReactNode // React 19 compatible children
  defaultTheme?: ThemeColors
  defaultRadius?: ThemeRadius
  storageKey?: string
}

// CSS Variables Interface for Theme System
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

// Theme Preset System
export interface ThemePreset {
  name: string
  label: string
  cssClass: string
  light: ThemeCSSVariables
  dark: ThemeCSSVariables
}

export const THEME_PRESET_OPTIONS = [
  {
    label: "Default",
    value: "default",
    primary: {
      light: "oklch(0.205 0 0)",
      dark: "oklch(0.922 0 0)",
    },
  },
] as const;

export const THEME_PRESET_VALUES = THEME_PRESET_OPTIONS.map((p) => p.value);
export type ThemePresetValue = (typeof THEME_PRESET_OPTIONS)[number]["value"];

// Legacy Theme Types for Backward Compatibility
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
	theme: Theme
	setTheme: (theme: Theme) => void
	toggleTheme: () => void
}

// ========================
// LAYOUT PREFERENCES SYSTEM - Moved from frontend for cross-app sharing
// ========================

// Sidebar Variant Types
export const SIDEBAR_VARIANT_OPTIONS = [
  { label: "Inset", value: "inset" },
  { label: "Sidebar", value: "sidebar" },
  { label: "Floating", value: "floating" },
] as const;
export const SIDEBAR_VARIANT_VALUES = SIDEBAR_VARIANT_OPTIONS.map((v) => v.value);
export type SidebarVariant = (typeof SIDEBAR_VARIANT_VALUES)[number];

// Sidebar Collapsible Types
export const SIDEBAR_COLLAPSIBLE_OPTIONS = [
  { label: "Icon", value: "icon" },
  { label: "Offcanvas", value: "offcanvas" },
] as const;
export const SIDEBAR_COLLAPSIBLE_VALUES = SIDEBAR_COLLAPSIBLE_OPTIONS.map((v) => v.value);
export type SidebarCollapsible = (typeof SIDEBAR_COLLAPSIBLE_VALUES)[number];

// Content Layout Types
export const CONTENT_LAYOUT_OPTIONS = [
  { label: "Centered", value: "centered" },
  { label: "Full Width", value: "full-width" },
] as const;
export const CONTENT_LAYOUT_VALUES = CONTENT_LAYOUT_OPTIONS.map((v) => v.value);
export type ContentLayout = (typeof CONTENT_LAYOUT_VALUES)[number];

// Legacy Sidebar Context Types
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
	icon?: IconType // Proper union type for React components and string identifiers
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
