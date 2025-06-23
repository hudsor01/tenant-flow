import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import '@/index.css';
import { logStripeConfigStatus } from '@/lib/stripe-config';
// import { memoryMonitor } from '@/utils/memoryMonitor'; // Disabled to prevent CPU overload

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      refetchInterval: false,
      retry: (failureCount, error) => {
        if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
          return false;
        }
        return failureCount < 3;
      },
      // Add memory optimization
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      // Prevent mutation caching to reduce memory usage
      gcTime: 0,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(rootElement);

// Log Stripe configuration status in development
logStripeConfigStatus();

// DISABLED: Memory monitoring was causing high CPU usage and overheating
// if (import.meta.env.DEV) {
//   memoryMonitor.start(10000); // Monitor every 10 seconds in development
//   console.log('🔍 Memory monitoring enabled in development mode');
// }

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);