import { createTRPCReact, httpBatchLink, loggerLink } from "@trpc/react-query";
// import { createTRPCProxyClient } from "@trpc/client"; // Unused import
import superjson from 'superjson';
import { createClient } from "@supabase/supabase-js";
import { QueryClient } from '@tanstack/react-query';

// Import AppRouter type from frontend types
import type { AppRouter } from "../types/trpc";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes default
      gcTime: 10 * 60 * 1000, // 10 minutes cache
      retry: 1,
      refetchOnWindowFocus: false, // Prevent excessive refetching
      refetchOnReconnect: false,
      refetchInterval: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    loggerLink({
      enabled: (opts) => {
        if (import.meta.env.DEV) {
          return true; // Log everything in development
        }
        return opts.direction === 'down' && opts.result instanceof Error;
      },
    }),
    httpBatchLink({
      url: `${import.meta.env.VITE_API_BASE_URL}/trpc`,
      method: 'POST',
      async headers() {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            if (import.meta.env.DEV) {
              console.warn('Session error:', error);
            }
            return {};
          }
          return data.session?.access_token
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {};
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Failed to get session for auth header:', error);
          }
          return {};
        }
      },
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
          signal: AbortSignal.timeout(15000), // 15s timeout for better reliability
        }).catch((error) => {
          // Add better error context for debugging
          const isTimeoutError = error.name === 'TimeoutError' || error.name === 'AbortError';
          const isNetworkError = error.name === 'TypeError' && error.message.includes('fetch');
          
          if (import.meta.env.DEV) {
            console.error('tRPC Fetch Error:', {
              url,
              error: error.message,
              isTimeout: isTimeoutError,
              isNetwork: isNetworkError,
            });
          }
          
          throw error;
        });
      },
    }),
  ],
});
