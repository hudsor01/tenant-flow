import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/lib/router-instance'

// Background sync wrapper component
function RouterWithSync() {
	// Note: Moving background sync to a higher level to avoid router context issues
	return <RouterProvider router={router} />
}

// Router component with enhanced DevTools
export function Router() {
	// Temporarily disable DevTools to isolate router issues
	return <RouterWithSync />
}