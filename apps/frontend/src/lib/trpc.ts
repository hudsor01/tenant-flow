import { createTRPCReact } from '@trpc/react-query'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import type { AppRouter } from '../../../backend/src/trpc/app-router'

// React Query integration
export const trpc = createTRPCReact<AppRouter>()

// Vanilla client for server-side usage
export const trpcClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_BASE_URL}/trpc`,
      headers() {
        const token = localStorage.getItem('supabase.auth.token')
        return {
          authorization: token ? `Bearer ${token}` : '',
        }
      },
    }),
  ],
})

// Export AppRouter type for use in other files
export type { AppRouter }