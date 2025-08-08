/**
 * 404 Not Found Page - Server Component
 * Displays when a requested page cannot be found
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search, AlertCircle, HelpCircle, Mail } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { NotFoundActions } from '@/components/error/not-found-actions'

export const metadata: Metadata = {
  title: '404 - Page Not Found | TenantFlow',
  description: 'The page you\'re looking for could not be found. Return to your dashboard or explore our features.',
}

export default function NotFound() {
  return (
    <AuthLayout 
      title="Page Not Found"
      subtitle="We can't find the page you're looking for"
      description="The page might have been moved, deleted, or the URL might be incorrect"
      side="left"
      image={{
        src: "/images/roi-up_to_the_right.jpg",
        alt: "Page not found - TenantFlow"
      }}
      heroContent={{
        title: "Every Path Leads Somewhere",
        description: "Even when you take a wrong turn, TenantFlow helps you find your way back to efficient property management"
      }}
      features={[
        {
          icon: <Search className="h-5 w-5" />,
          title: 'Easy Navigation',
          description: 'Find what you need quickly'
        },
        {
          icon: <HelpCircle className="h-5 w-5" />,
          title: 'Always Supported',
          description: 'Help is just a click away'
        },
        {
          icon: <Home className="h-5 w-5" />,
          title: 'Return Home',
          description: 'Get back to your dashboard'
        }
      ]}
    >
      <div className="space-y-6">
        {/* Large 404 visual indicator */}
        <div className="text-center">
          <div className="relative mb-6">
            <div className="text-8xl font-bold text-muted-foreground/20 select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons - Client component for interactivity */}
        <div className="flex flex-col gap-3">
          <Link href="/dashboard" className="w-full">
            <Button className="w-full flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          
          {/* Interactive back button - Client component */}
          <NotFoundActions />

          <Link href="/" className="w-full">
            <Button variant="ghost" className="w-full flex items-center justify-center gap-2">
              <Search className="h-4 w-4" />
              Visit Homepage
            </Button>
          </Link>
        </div>

        {/* Help section */}
        <div className="pt-4 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Still need help finding what you're looking for?
          </p>
          <Button 
            variant="link" 
            className="text-sm p-0 h-auto flex items-center gap-1"
            asChild
          >
            <a href="mailto:support@tenantflow.com">
              <Mail className="h-3 w-3" />
              Contact Support
            </a>
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}