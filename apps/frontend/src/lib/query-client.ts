import { createEnhancedQueryClient } from './error-handling'

// Create a QueryClient instance with enhanced error handling and optimized defaults
export const queryClient = createEnhancedQueryClient()

// Development instrumentation is handled by react-query devtools