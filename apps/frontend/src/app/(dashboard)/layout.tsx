import { Suspense } from 'react';
import type { Metadata } from '@/types/next.d';
import { CommandPaletteProvider } from '@/hooks/use-command-palette';
import { DashboardLayoutClient } from './dashboard-layout-client';
import { QueryProvider } from '@/providers/query-provider';
import { PHProvider } from '@/providers/posthog-provider';
import { PostHogPageView } from '@/components/analytics/posthog-page-view';
import { PostHogUserProvider } from '@/components/analytics/posthog-user-provider';
import { PostHogErrorBoundary } from '@/components/analytics/posthog-error-boundary';
import { ServerAuthGuard } from '@/components/auth/server-auth-guard';
import { AuthProvider } from '@/providers/auth-provider';
import { ProtectedRouteGuard } from '@/components/auth/protected-route-guard';

export const metadata: Metadata = {
  title: {
    template: '%s | Dashboard - TenantFlow',
    default: 'Dashboard - TenantFlow'
  },
  description: 'Property management dashboard for landlords and property managers.',
  robots: { index: false, follow: false }, // Private area
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode; // Parallel route for @modal
  sidebar: React.ReactNode; // Parallel route for @sidebar
}


export default function DashboardLayout({
  children,
  modal,
  sidebar,
}: DashboardLayoutProps) {
  return (
    <ServerAuthGuard requireAuth={true}>
      <AuthProvider>
        <PHProvider>
          <PostHogErrorBoundary>
            <QueryProvider>
              <PostHogUserProvider>
                <CommandPaletteProvider>
                  <Suspense fallback={null}>
                    <PostHogPageView />
                  </Suspense>
                  
                  <ProtectedRouteGuard>
                    <DashboardLayoutClient
                      modal={modal}
                      sidebar={sidebar}
                    >
                      {children}
                    </DashboardLayoutClient>
                  </ProtectedRouteGuard>
                  
                </CommandPaletteProvider>
              </PostHogUserProvider>
            </QueryProvider>
          </PostHogErrorBoundary>
        </PHProvider>
      </AuthProvider>
    </ServerAuthGuard>
  );
}