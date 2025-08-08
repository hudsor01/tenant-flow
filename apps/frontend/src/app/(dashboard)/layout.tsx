import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/dashboard-navigation';
import { Sidebar } from '@/components/dashboard/dashboard-sidebar';
import { QueryProvider } from '@/providers/query-provider';
import { Loader2 } from 'lucide-react';

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
    <QueryProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <div className="flex">
          {/* Sidebar with suspense boundary */}
          <Suspense fallback={<div className="w-64 bg-white shadow-sm" />}>
            <aside className="w-64 bg-white shadow-sm">
              {sidebar || <Sidebar />}
            </aside>
          </Suspense>

          {/* Main content area */}
          <main className="flex-1 p-6">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            }>
              {children}
            </Suspense>
          </main>
        </div>

        {/* Modal parallel route */}
        {modal}
      </div>
    </QueryProvider>
  );
}