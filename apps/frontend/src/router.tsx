import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/lib/router-instance'

// React Bootstrap Safety Check
function ensureReactBootstrap() {
	// Defensive check for React availability before any component renders
	if (typeof window !== 'undefined') {
		if (!window.React) {
			console.error('🔥 CRITICAL: React not available globally when Router attempted to render')
			throw new Error('React global bootstrap failed - React not available')
		}
		
		if (!window.React.Children) {
			console.error('🔥 CRITICAL: React.Children not available when Router attempted to render')
			throw new Error('React.Children not available - bootstrap incomplete')
		}
		
		if (!window.__REACT_BOOTSTRAP_READY__) {
			console.error('🔥 CRITICAL: React bootstrap not complete when Router attempted to render')
			throw new Error('React bootstrap not ready - premature component render')
		}
	}
}

// Background sync wrapper component
function RouterWithSync() {
	// CRITICAL: Ensure React is bootstrapped before any rendering
	ensureReactBootstrap()
	
	try {
		const result = <RouterProvider router={router} />
		return result
	} catch (error) {
		console.error('Failed to render RouterProvider:', error)
		throw error
	}
}

// Router component with enhanced DevTools
export function Router() {
	// CRITICAL: Double-check React bootstrap at entry point
	ensureReactBootstrap()
	
	try {
		const result = <RouterWithSync />
		return result
	} catch (error) {
		console.error('Failed to render RouterWithSync:', error)
		throw error
	}
}