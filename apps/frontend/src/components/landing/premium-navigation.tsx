/**
 * Premium Navigation - Glass Morphism with Magic UI
 * Modern navigation with smooth animations and premium effects
 */

"use client";

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASING_CURVES } from '@/lib/animations/constants'
import { ShimmerButton } from '@/components/magicui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function PremiumNavigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: EASING_CURVES.GENTLE }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled 
          ? "bg-background/80 backdrop-blur-2xl border-b border-border/40 shadow-sm" 
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 opacity-75 blur-lg group-hover:opacity-100 transition-opacity" />
              <div className="relative rounded-lg bg-black px-2 py-1">
                <span className="text-xl font-bold text-white">T</span>
              </div>
            </div>
            <span className="text-xl font-semibold text-foreground">
              TenantFlow
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center rounded-full border border-border/50 bg-background/50 backdrop-blur-sm px-1 py-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-4 py-1.5 text-sm font-medium transition-colors"
                >
                  {pathname === item.href && (
                    <motion.div
                      layoutId="navbar-active"
                      className="absolute inset-0 rounded-full bg-foreground/10"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className={cn(
                    "relative z-10 transition-colors",
                    pathname === item.href 
                      ? "text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}>
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <button className="relative px-4 py-1.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground rounded-md duration-200">
                Sign In
              </button>
            </Link>
            <Link href="/sign-up">
              <ShimmerButton 
                className="px-4 py-2 text-sm font-medium"
                shimmerColor="#3b82f6"
                background="linear-gradient(to right, #3b82f6, #8b5cf6)"
              >
                Get Started Free
                <span className="ml-1">→</span>
              </ShimmerButton>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden relative w-8 h-8 flex items-center justify-center"
          >
            <div className="relative">
              <motion.span
                animate={isMobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="absolute block h-0.5 w-6 bg-current -translate-y-2"
              />
              <motion.span
                animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="absolute block h-0.5 w-6 bg-current"
              />
              <motion.span
                animate={isMobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                className="absolute block h-0.5 w-6 bg-current translate-y-2"
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t border-border/50"
          >
            <div className="bg-background/95 backdrop-blur-xl px-6 py-4">
              <div className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      pathname === item.href 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
                  <Link href="/auth/login">
                    <button className="w-full text-left text-sm font-medium text-muted-foreground">
                      Sign In
                    </button>
                  </Link>
                  <ShimmerButton 
                    className="w-full px-4 py-2 text-sm font-medium"
                    shimmerColor="hsl(var(--primary))"
                  >
                    Get Started Free
                  </ShimmerButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}