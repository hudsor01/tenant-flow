'use client'

import { Suspense, useState } from 'react';
import { Navigation } from '@/components/dashboard/dashboard-navigation';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
// import { CommandPalette } from '@/components/command-palette';
// import { MobileNav } from '@/components/mobile-nav';
// import { MobileHeader } from '@/components/mobile-header';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  modal: React.ReactNode;
  sidebar: React.ReactNode;
}

export function DashboardLayoutClient({
  children,
  modal,
  sidebar,
}: DashboardLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const _handleMobileMenuToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Only visible on mobile */}
      {/* <MobileHeader 
        onMenuToggle={handleMobileMenuToggle}
        isMenuOpen={isMobileSidebarOpen}
      /> */}

      {/* Desktop Navigation - Hidden on mobile */}
      <div className="hidden md:block">
        <Navigation />
      </div>
      
      <div className="flex">
        {/* Desktop Sidebar - Hidden on mobile */}
        <Suspense fallback={<div className="hidden md:block w-64 bg-white shadow-sm" />}>
          <aside className="hidden md:block w-64 bg-white shadow-sm">
            {sidebar || <DashboardSidebar />}
          </aside>
        </Suspense>

        {/* Mobile Sidebar Overlay - Only on mobile */}
        <DashboardSidebar 
          isOpen={isMobileSidebarOpen}
          onClose={handleMobileSidebarClose}
          isMobile={true}
        />

        {/* Main content area */}
        <main className="flex-1 md:p-6 pt-0 md:pt-6 pb-20 md:pb-6">
          {/* Add top padding on mobile to account for mobile header */}
          <div className="md:hidden h-4" />
          
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }>
            <div className="px-4 md:px-0">
              {children}
            </div>
          </Suspense>
        </main>
      </div>

      {/* Mobile Navigation - Fixed bottom, only visible on mobile */}
      {/* <MobileNav /> */}

      {/* Modal parallel route */}
      {modal}
      
      {/* Global Command Palette */}
      {/* <CommandPalette /> */}

      {/* Safe area styles for mobile devices */}
      <style jsx global>{`
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        .safe-area-pt {
          padding-top: env(safe-area-inset-top);
        }
        
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-area-pb {
            padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
          }
        }
        
        @supports (padding-top: env(safe-area-inset-top)) {
          .safe-area-pt {
            padding-top: calc(0rem + env(safe-area-inset-top));
          }
        }

        /* Prevent body scroll when mobile sidebar is open */
        body.mobile-sidebar-open {
          overflow: hidden;
        }

        /* Mobile-specific adjustments */
        @media (max-width: 768px) {
          /* Ensure content doesn't go under mobile navigation */
          .dashboard-main-content {
            margin-bottom: 5rem; /* Height of mobile nav + safe area */
          }

          /* Adjust mobile header height for different devices */
          .mobile-header {
            min-height: 3.5rem;
          }
        }

        /* Handle notched devices */
        @media (max-width: 768px) and (display-mode: standalone) {
          .mobile-header {
            padding-top: env(safe-area-inset-top);
          }
        }
      `}</style>
    </div>
  );
}