// UI component prop interfaces and types
import type React from 'react'

// Error boundary types
export interface ErrorBoundaryState {
	hasError: boolean
	error?: Error
	errorInfo?: React.ErrorInfo
}

export interface ErrorBoundaryProps {
	children: React.ReactNode
	fallback?: React.ComponentType<ErrorFallbackProps>
}

export interface ErrorFallbackProps {
	error: Error
	resetError: () => void
}

// Common component props
export interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title?: string
	description?: string
	children: React.ReactNode
}

export interface FileUploadProps {
	onFileUpload: (files: File[]) => void
	accept?: string
	multiple?: boolean
	maxSize?: number
}

// Add other UI-related types here as we move them
