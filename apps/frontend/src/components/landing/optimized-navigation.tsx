/**
 * Optimized Navigation - Server Component
 * Static navigation with locale-aware links
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'

interface OptimizedNavigationProps {
  locale: string
}

export function OptimizedNavigation({ locale }: OptimizedNavigationProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 backdrop-blur-sm bg-white/95">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">TenantFlow</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link href={`/${locale}/features`} className="text-gray-600 hover:text-gray-900 transition-colors">
            Features
          </Link>
          <Link href={`/${locale}/pricing`} className="text-gray-600 hover:text-gray-900 transition-colors">
            Pricing
          </Link>
          <Link href={`/${locale}/customers`} className="text-gray-600 hover:text-gray-900 transition-colors">
            Customers
          </Link>
          <Link href={`/${locale}/resources`} className="text-gray-600 hover:text-gray-900 transition-colors">
            Resources
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Link href={`/${locale}/login`}>
            <Button variant="ghost" className="hidden sm:inline-flex">
              Sign In
            </Button>
          </Link>
          <Link href={`/${locale}/signup`}>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}