/**
 * Frontend-only types that should not be included in backend builds
 * These types depend on React and DOM APIs
 * Updated for React 19 compatibility
 */

// Type definitions that rely on React namespace
// These will work when React types are available in the consuming app

// ========================
// React 19 Event and Handler Types (Frontend Only)
// ========================

/**
 * Change event handler for form inputs
 * React 19 compatible with proper typing
 */
export type ChangeHandler<T extends HTMLElement = HTMLInputElement> = (
	event: React.ChangeEvent<T>
) => void

/**
 * Click event handler
 * React 19 compatible with proper typing
 */
export type ClickHandler<T extends HTMLElement = HTMLElement> = (
	event: React.MouseEvent<T>
) => void

/**
 * Submit event handler
 * React 19 compatible with proper typing
 */
export type SubmitHandler<T extends HTMLElement = HTMLFormElement> = (
	event: React.FormEvent<T>
) => void

/**
 * Async form action handler for React 19
 * Compatible with useFormState and server actions
 */
export type AsyncFormAction<T = FormData> = (
	prevState: unknown,
	formData: T
) => Promise<unknown>

/**
 * Form action handler (sync or async)
 * React 19 compatible form actions
 */
export type FormAction = string | ((formData: FormData) => void | Promise<void>)

/**
 * Event handler with optional preventDefault
 * Common pattern for form submissions
 */
export type PreventableEventHandler<T extends Event = Event> = (
	event: T
) => void | Promise<void>

/**
 * Generic async event handler
 * For async operations triggered by user events
 */
export type AsyncEventHandler<T extends Event = Event> = (
	event: T
) => Promise<void>

/**
 * Keyboard event handler
 */
export type KeyboardHandler<T extends HTMLElement = HTMLElement> = (
	event: React.KeyboardEvent<T>
) => void

/**
 * Focus event handler
 */
export type FocusHandler<T extends HTMLElement = HTMLElement> = (
	event: React.FocusEvent<T>
) => void

/**
 * Blur event handler
 */
export type BlurHandler<T extends HTMLElement = HTMLElement> = (
	event: React.FocusEvent<T>
) => void

// ========================
// React 19 Component Prop Types (Frontend Only)
// ========================

/**
 * Props for components with children
 */
export type WithChildren<T = Record<string, unknown>> = T & {
	children?: React.ReactNode
}

/**
 * Props for components that can be rendered as different elements
 */
export interface AsProps<T = React.ComponentType> {
	as?: T
}

/**
 * Form props for React 19 with action support
 */
export interface FormProps {
	action?: FormAction
	onSubmit?: SubmitHandler<HTMLFormElement>
}

/**
 * Button props for React 19 with formAction support
 */
export interface ButtonProps {
	formAction?: FormAction
	onClick?: ClickHandler<HTMLButtonElement>
}

/**
 * Input props with proper event handlers
 */
export interface InputProps {
	onChange?: ChangeHandler<HTMLInputElement>
	onBlur?: BlurHandler<HTMLInputElement>
	onFocus?: FocusHandler<HTMLInputElement>
}

/**
 * Select props with proper event handlers
 */
export interface SelectProps {
	onChange?: ChangeHandler<HTMLSelectElement>
	onBlur?: BlurHandler<HTMLSelectElement>
	onFocus?: FocusHandler<HTMLSelectElement>
}

/**
 * Textarea props with proper event handlers
 */
export interface TextareaProps {
	onChange?: ChangeHandler<HTMLTextAreaElement>
	onBlur?: BlurHandler<HTMLTextAreaElement>
	onFocus?: FocusHandler<HTMLTextAreaElement>
}

/**
 * Props for components that handle loading states
 */
export interface WithLoadingState {
	isLoading?: boolean
	loadingText?: string
}

/**
 * Props for components with error states
 */
export interface WithErrorState {
	error?: string | null
	onClearError?: () => void
}

/**
 * Combined state props for forms and data components
 */
export interface WithFormState extends WithLoadingState, WithErrorState {
	isSubmitting?: boolean
	isDirty?: boolean
	isValid?: boolean
}

// ========================
// File Upload Types (Frontend Only)
// ========================

/**
 * File upload state
 */
export interface FileUploadState {
	file: File | null
	progress: UploadProgress
	status: UploadStatus
	error: string | null
}

// Re-export types that don't depend on DOM/React
export interface UploadProgress {
	loaded: number
	total: number
	percentage: number
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

// ========================
// Profile & Dashboard Types (Frontend Only)
// ========================

/**
 * Profile data interface for user profile forms
 */
export interface ProfileData {
	name: string
	email: string
	phone?: string
	company?: string
	fullName?: string
	bio?: string
}

/**
 * Dashboard statistics interface
 */
export interface DashboardStats {
	total: number
	occupied: number
	vacant: number
	properties?: number
	tenants?: number
	leases?: number
	maintenanceRequests?: number
	totalRevenue?: number
	occupancyRate?: number
}
