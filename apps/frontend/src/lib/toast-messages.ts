/**
 * Standardized toast messages for consistent user feedback
 * Usage: toast.success(toastMessages.success.created('property'))
 */

export const toastMessages = {
	success: {
		// Generic CRUD operations
		created: (entity: string) => `${capitalize(entity)} created successfully`,
		updated: (entity: string) => `${capitalize(entity)} updated successfully`,
		deleted: (entity: string) => `${capitalize(entity)} deleted successfully`,
		uploaded: (entity: string) => `${capitalize(entity)} uploaded successfully`,
		
		// Specific operations
		saved: (entity: string) => `${capitalize(entity)} saved successfully`,
		sent: (entity: string) => `${capitalize(entity)} sent successfully`,
		invited: (entity: string) => `${capitalize(entity)} invited successfully`,
		approved: (entity: string) => `${capitalize(entity)} approved successfully`,
		rejected: (entity: string) => `${capitalize(entity)} rejected successfully`,
		generated: (entity: string) => `${capitalize(entity)} generated successfully`,
		
		// Authentication
		signedIn: 'Successfully signed in',
		signedOut: 'Successfully signed out',
		passwordChanged: 'Password changed successfully',
		emailVerified: 'Email verified successfully',
		
		// Subscriptions & Payments
		subscriptionCreated: 'Subscription created successfully',
		subscriptionCancelled: 'Subscription cancelled successfully',
		paymentProcessed: 'Payment processed successfully',
		
		// Generic success
		operationCompleted: 'Operation completed successfully',
		changesSaved: 'Changes saved successfully'
	},
	
	error: {
		// Generic CRUD operations
		create: (entity: string) => `Failed to create ${entity}`,
		update: (entity: string) => `Failed to update ${entity}`,
		delete: (entity: string) => `Failed to delete ${entity}`,
		load: (entity: string) => `Failed to load ${entity}`,
		upload: (entity: string) => `Failed to upload ${entity}`,
		
		// Specific operations
		save: (entity: string) => `Failed to save ${entity}`,
		send: (entity: string) => `Failed to send ${entity}`,
		invite: (entity: string) => `Failed to invite ${entity}`,
		approve: (entity: string) => `Failed to approve ${entity}`,
		reject: (entity: string) => `Failed to reject ${entity}`,
		
		// Authentication
		signIn: 'Failed to sign in',
		signOut: 'Failed to sign out',
		passwordChange: 'Failed to change password',
		emailVerification: 'Failed to verify email',
		unauthorized: 'You are not authorized to perform this action',
		sessionExpired: 'Your session has expired. Please sign in again',
		
		// Subscriptions & Payments
		subscriptionCreate: 'Failed to create subscription',
		subscriptionCancel: 'Failed to cancel subscription',
		paymentProcess: 'Failed to process payment',
		
		// Validation
		invalidInput: 'Please check your input and try again',
		requiredFields: 'Please fill in all required fields',
		invalidEmail: 'Please enter a valid email address',
		invalidFile: 'Please select a valid file',
		fileTooLarge: 'File is too large. Please select a smaller file',
		
		// Network
		networkError: 'Network error. Please check your connection and try again',
		serverError: 'Server error. Please try again later',
		timeout: 'Request timed out. Please try again',
		
		// Generic error
		unexpected: 'An unexpected error occurred. Please try again',
		operationFailed: 'Operation failed. Please try again'
	},
	
	warning: {
		// Data warnings
		unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
		confirmDelete: (entity: string) => `Are you sure you want to delete this ${entity}?`,
		confirmCancel: (entity: string) => `Are you sure you want to cancel this ${entity}?`,
		
		// Validation warnings
		partialData: 'Some data may be incomplete',
		duplicateEntry: 'This entry may already exist',
		
		// System warnings
		maintenanceMode: 'System is in maintenance mode. Some features may be unavailable',
		experimentalFeature: 'This is an experimental feature. Use with caution',
		
		// Generic warning
		proceedWithCaution: 'Please proceed with caution'
	},
	
	info: {
		// Loading states
		loading: (entity: string) => `Loading ${entity}...`,
		saving: (entity: string) => `Saving ${entity}...`,
		uploading: (entity: string) => `Uploading ${entity}...`,
		processing: 'Processing...',
		
		// Status updates
		emailSent: 'Email sent. Please check your inbox',
		invitationSent: 'Invitation sent successfully',
		reminderSent: 'Reminder sent successfully',
		
		// Feature info
		featureUnavailable: 'This feature is temporarily unavailable',
		comingSoon: 'This feature is coming soon',
		
		// Generic info
		noData: 'No data available',
		noResults: 'No results found',
		allCaughtUp: 'You\'re all caught up!'
	}
}

// Helper function to capitalize first letter
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

// Utility functions for common toast patterns
export const toastUtils = {
	/**
	 * Success toast for CRUD operations
	 */
	crudSuccess: (operation: 'create' | 'update' | 'delete', entity: string) => {
		const message = toastMessages.success[operation === 'create' ? 'created' : operation === 'update' ? 'updated' : 'deleted']
		return message(entity)
	},
	
	/**
	 * Error toast for CRUD operations
	 */
	crudError: (operation: 'create' | 'update' | 'delete' | 'load', entity: string) => {
		const message = toastMessages.error[operation]
		return message(entity)
	},
	
	/**
	 * API error message handler
	 */
	apiError: (error: Error | { response?: { status: number }; message?: string }) => {
		const apiError = error as Error & { response?: { status: number }; message?: string }
		if (apiError?.response?.status === 401) {
			return toastMessages.error.unauthorized
		}
		if (apiError?.response?.status === 403) {
			return toastMessages.error.unauthorized
		}
		if (apiError?.response?.status && apiError.response.status >= 500) {
			return toastMessages.error.serverError
		}
		if (error?.message) {
			return error.message
		}
		return toastMessages.error.unexpected
	}
}