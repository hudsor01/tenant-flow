/**
 * Jotai Store Configuration
 * Central store instance for the application
 */

import { createStore } from 'jotai'

// Create the main store instance
export const store = createStore()

// Development tools setup
if (process.env.NODE_ENV === 'development') {
	// Store will be connected to DevTools in the provider
	// DevTools integration will be added via jotai/devtools when available
}
