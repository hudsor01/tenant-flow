import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'

// Create a custom render function that includes providers
export const AllTheProviders = ({
	children
}: {
	children: React.ReactNode
}) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				staleTime: 0,
				gcTime: 0
			},
			mutations: {
				retry: false
			}
		}
	})

	// Create a memory router for testing
	const router = createMemoryRouter({
		routeTree,
		context: {
			queryClient,
		},
	})

	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router}>
				{children}
			</RouterProvider>
		</QueryClientProvider>
	)
}
