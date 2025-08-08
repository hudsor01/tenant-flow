'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NavigationSection() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={cn(
      "border-b bg-white/80 backdrop-blur-sm fixed w-full top-0 z-50 transition-all duration-300",
      scrollY > 50 && "shadow-lg"
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
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
          <Link href="/demo" className="text-gray-600 hover:text-gray-900 transition-colors">Demo</Link>
          <Link href="/blog" className="text-gray-600 hover:text-gray-900 transition-colors">Blog</Link>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/login">
            <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}