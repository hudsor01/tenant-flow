import type { Metadata } from '@/types/next.d';
import { AuthProvider } from '@/providers/auth-provider';

export const metadata: Metadata = {
  title: {
    template: '%s | TenantFlow',
    default: 'TenantFlow - Property Management Made Simple'
  },
  description: 'Modern property management software for landlords and property managers.',
  robots: { index: true, follow: true }, // Public pages should be indexed
};

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for public pages (marketing, auth, etc.)
 * 
 * This layout provides AuthProvider for pages that might need auth state
 * (like auth pages that check if user is already logged in) but doesn't
 * enforce authentication requirements.
 */
export default function PublicLayout({
  children,
}: PublicLayoutProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}