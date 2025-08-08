/**
 * Sticky CTA Bar - Client Component
 * Scroll-triggered call-to-action bar with interactivity
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

interface StickyCtaBarProps {
  locale: string
}

export function StickyCtaBar({ locale }: StickyCtaBarProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      setIsVisible(scrollPercent > 30 && scrollPercent < 90)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-blue-600 text-white py-4 px-4 shadow-2xl transform transition-transform duration-300 z-40 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div>
          <p className="font-semibold">Ready to save 10+ hours per week?</p>
          <p className="text-sm opacity-90">Join 10,000+ property managers • No credit card required</p>
        </div>
        <Link href={`/${locale}/signup`}>
          <Button className="bg-white text-blue-600 hover:bg-gray-100 transition-colors">
            Start Free Trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}