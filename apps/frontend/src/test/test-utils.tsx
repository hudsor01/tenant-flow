import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a custom render function that includes providers for testing components without routing
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

	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	)
}
