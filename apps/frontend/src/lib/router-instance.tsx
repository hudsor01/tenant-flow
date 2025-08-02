import { createRouter } from '@tanstack/react-router'
import { queryClient } from './clients/index'
import { api } from './api/axios-client'
import { routeTree } from '../routeTree.gen'

// Create a new router instance
export const router = createRouter({
  routeTree,
  context: {
    queryClient,
    api,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  defaultNotFoundComponent: () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
        <a href="/" className="mt-4 text-primary hover:underline">Go back home</a>
      </div>
    )
  },
})

// Register the router instance for maximum type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}