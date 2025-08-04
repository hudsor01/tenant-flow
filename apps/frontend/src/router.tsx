import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/lib/router-instance'

// Background sync wrapper component
function RouterWithSync() {
	// RouterWithSync starting
	try {
		const result = <RouterProvider router={router} />
		// RouterProvider rendered successfully
		return result
	} catch (error) {
		console.error('Failed to render RouterProvider:', error)
		throw error
	}
}

// Router component with enhanced DevTools
export function Router() {
	// Router component starting
	try {
		const result = <RouterWithSync />
		// RouterWithSync called successfully
		return result
	} catch (error) {
		console.error('Failed to render RouterWithSync:', error)
		throw error
	}
}