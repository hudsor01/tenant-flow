import type { Metadata } from '@/types/next.d'

interface BillingLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  showNavigation?: boolean
}

/**
 * Server Component - BillingLayout
 * Provides consistent layout and SEO metadata for all billing pages
 */
export function BillingLayout({ 
  children, 
  title = "Billing", 
  description = "Manage your TenantFlow subscription and billing",
  showNavigation = true 
}: BillingLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {showNavigation && (
            <nav className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">{title}</h1>
                  <p className="text-muted-foreground mt-1">{description}</p>
                </div>
              </div>
            </nav>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Generate metadata for billing pages
 */
export function generateBillingMetadata(
  title: string,
  description?: string
): Metadata {
  return {
    title: `${title} | TenantFlow`,
    description: description || "Manage your TenantFlow subscription and billing",
    robots: {
      index: false, // Don't index billing pages
      follow: false,
    },
  }
}