/**
 * Frontend-only types that should not be included in backend builds
 * These types depend on React and DOM APIs
 */

// ========================
// Event and Handler Types (Frontend Only)
// ========================

/**
 * Change event handler for form inputs
 */
export type ChangeHandler<T = HTMLInputElement> = (
	event: React.ChangeEvent<T>
) => void

/**
 * Click event handler
 */
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void

/**
 * Submit event handler
 */
export type SubmitHandler<T = HTMLFormElement> = (
	event: React.FormEvent<T>
) => void

// ========================
// Component Prop Types (Frontend Only)
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
export interface AsProps<T extends React.ElementType = React.ElementType> {
	as?: T
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
