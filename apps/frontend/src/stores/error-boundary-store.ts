/**
 * Error Boundary Store - Global Error State Management
 *
 * Follows Zustand best practices and CLAUDE.md guidelines:
 * - Manages error boundary state globally for consistent error handling
 * - Allows error recovery and retry functionality across the app
 * - Integrates with logging and error reporting systems
 */

import { create } from 'zustand'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'ErrorBoundaryStore' })

export interface ErrorState {
	hasError: boolean
	error?: Error
	errorId?: string
	timestamp?: Date
	context?: string
}

export interface ErrorBoundaryState {
	// Current error state
	errorState: ErrorState

	// Actions
	setError: (error: Error, context?: string) => void
	clearError: () => void
	resetError: () => void

	// Computed properties
	isInErrorState: boolean
}

const initialErrorState: ErrorState = {
	hasError: false
}

export const useErrorBoundaryStore = create<ErrorBoundaryState>((set, get) => ({
	errorState: initialErrorState,

	setError: (error: Error, context?: string) => {
		const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

		logger.error('Error boundary caught error', {
			action: 'error_boundary_set_error',
			metadata: {
				errorId,
				error: error.message,
				stack: error.stack,
				context
			}
		})

		const newErrorState: ErrorState = {
			hasError: true,
			error,
			errorId,
			timestamp: new Date()
		}

		if (context) {
			newErrorState.context = context
		}

		set({ errorState: newErrorState })
	},

	clearError: () => {
		const currentState = get().errorState

		if (currentState.hasError) {
			logger.info('Error boundary cleared error', {
				action: 'error_boundary_clear_error',
				metadata: {
					errorId: currentState.errorId,
					context: currentState.context
				}
			})
		}

		set({ errorState: initialErrorState })
	},

	resetError: () => {
		get().clearError()
	},

	get isInErrorState() {
		return get().errorState.hasError
	}
}))
