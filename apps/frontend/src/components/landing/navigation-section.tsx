// apps/frontend/src/components/landing/navigation-section.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NavigationSection(): React.ReactElement {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={cn(
      'border-b bg-white/80 backdrop-blur-sm fixed w-full top-0 z-50 transition-all duration-300',
      scrollY > 50 && 'shadow-lg',
    )}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="relative">
            <Building2 className="h-8 w-8 text-blue-600 transition-transform group-hover:scale-110" />
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TenantFlow
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
          <Link href="/pricing"  className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
          <Link href="/demo"     className="text-gray-600 hover:text-gray-900 transition-colors">Demo</Link>
          <Link href="/blog"     className="text-gray-600 hover:text-gray-900 transition-colors">Blog</Link>
        </div>

        <div className="flex items-center space-x-4">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
