import { Suspense } from 'react';
import type { Metadata } from '@/types/next.d';
import { CommandPaletteProvider } from '@/hooks/use-command-palette';
import { DashboardLayoutClient } from './dashboard-layout-client';
import { QueryProvider } from '@/providers/query-provider';
import { PHProvider } from '@/providers/posthog-provider';
import { PostHogPageView } from '@/components/analytics/posthog-page-view';
import { PostHogUserProvider } from '@/components/analytics/posthog-user-provider';
import { PostHogErrorBoundary } from '@/components/analytics/posthog-error-boundary';

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
    <PHProvider>
      <PostHogErrorBoundary>
        <QueryProvider>
          <PostHogUserProvider>
            <CommandPaletteProvider>
              <Suspense fallback={null}>
                <PostHogPageView />
              </Suspense>
              
              <DashboardLayoutClient
                modal={modal}
                sidebar={sidebar}
              >
                {children}
              </DashboardLayoutClient>
              
            </CommandPaletteProvider>
          </PostHogUserProvider>
        </QueryProvider>
      </PostHogErrorBoundary>
    </PHProvider>
  );
}