'use client'

import { cn } from '@/lib/utils'
import { Navbar } from '@/components/navbar'
import React from 'react'

interface PageLayoutProps extends React.ComponentProps<'div'> {
  showNavbar?: boolean
  containerClass?: string
  children: React.ReactNode
}

export const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  ({ className, showNavbar = true, containerClass, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('min-h-screen bg-background', className)}
        {...props}
      >
        {showNavbar && <Navbar />}
        <main className={cn(
          'container mx-auto px-4 sm:px-6 lg:px-8',
          showNavbar ? 'pt-32' : 'pt-8',
          containerClass
        )}>
          {children}
        </main>
      </div>
    )
  }
)
PageLayout.displayName = 'PageLayout'

export default PageLayout