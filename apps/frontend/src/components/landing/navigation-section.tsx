// apps/frontend/src/components/landing/navigation-section.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, Sparkles, Menu, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NavigationSection(): React.ReactElement {
  const [scrollY, setScrollY] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = [
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/demo', label: 'Demo' },
    { 
      href: '/resources', 
      label: 'Resources', 
      dropdown: [
        { href: '/blog', label: 'Blog' },
        { href: '/guides', label: 'Guides' },
        { href: '/support', label: 'Support' }
      ]
    }
  ]

  return (
    <nav className={cn(
      'fixed w-full top-0 z-50 transition-all duration-300',
      'bg-white/95 backdrop-blur-md border-b border-gray-200/50',
      scrollY > 50 && 'shadow-xl shadow-black/5 bg-white/98'
    )}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Enhanced logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 animate-pulse" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            TenantFlow
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <div key={item.href} className="relative group">
              {item.dropdown ? (
                <button className="flex items-center space-x-1 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50">
                  <span>{item.label}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              ) : (
                <Link 
                  href={item.href} 
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                >
                  {item.label}
                </Link>
              )}
              
              {/* Dropdown menu */}
              {item.dropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                  <div className="py-2">
                    {item.dropdown.map((dropdownItem) => (
                      <Link
                        key={dropdownItem.href}
                        href={dropdownItem.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        {dropdownItem.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop CTA buttons */}
        <div className="hidden md:flex items-center space-x-3">
          <Button asChild variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-50">
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Link href="/auth/signup">Get Started Free</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-700" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={cn(
        'md:hidden absolute top-full left-0 right-0 bg-white/98 backdrop-blur-md border-b border-gray-200/50 shadow-xl transition-all duration-300',
        mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      )}>
        <div className="container mx-auto px-4 py-6 space-y-4">
          {navItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className="block py-2 text-gray-700 hover:text-gray-900 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
              {item.dropdown && (
                <div className="ml-4 mt-2 space-y-2">
                  {item.dropdown.map((dropdownItem) => (
                    <Link
                      key={dropdownItem.href}
                      href={dropdownItem.href}
                      className="block py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {dropdownItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Mobile CTA buttons */}
          <div className="pt-4 space-y-3">
            <Button asChild variant="ghost" className="w-full justify-center">
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                Sign In
              </Link>
            </Button>
            <Button
              asChild
              className="w-full justify-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                Get Started Free
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
