/**
 * Pricing page layout with React Query provider
 * Enables data fetching for interactive pricing components
 */

import { QueryProvider } from '@/providers/query-provider'

interface PricingLayoutProps {
  children: React.ReactNode
}

export default function PricingLayout({ children }: PricingLayoutProps) {
  return (
    <QueryProvider>
      {children}
    </QueryProvider>
  )
}