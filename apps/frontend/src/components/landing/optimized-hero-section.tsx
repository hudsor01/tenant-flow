/**
 * Optimized Hero Section - Server Component
 * Static hero with trust indicators and main value proposition
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star } from 'lucide-react'

interface OptimizedHeroSectionProps {
  locale: string
}

export function OptimizedHeroSection({ locale }: OptimizedHeroSectionProps) {
  const trustLogos = [
    { name: 'Century 21' },
    { name: 'RE/MAX' },
    { name: 'Keller Williams' },
    { name: 'Coldwell Banker' },
  ]

  return (
    <section className="pt-16 pb-20 px-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto text-center">
        {/* Trust Indicators */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="ml-2 text-gray-600 font-medium">4.9/5 (2,847 reviews)</span>
          </div>
        </div>

        {/* Main Value Prop */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
          Property Management
          <span className="block text-blue-600">Without the Headache</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Join 10,000+ property managers saving 10 hours per week with automated rent collection, maintenance tracking, and tenant portals.
        </p>

        {/* Single CTA with urgency */}
        <div className="mb-6">
          <Link href={`/${locale}/signup`}>
            <Button 
              size="lg" 
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-10 py-6 h-auto font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Start Your 14-Day Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            No credit card required • Setup in 5 minutes • Cancel anytime
          </p>
          <p className="mt-2 text-sm text-orange-600 font-semibold">
            🔥 437 property managers started their trial this week
          </p>
        </div>

        {/* Social Proof Logos */}
        <div className="mt-12">
          <p className="text-sm text-gray-500 mb-4">Trusted by leading property management companies</p>
          <div className="flex justify-center items-center gap-8 opacity-60 grayscale">
            {trustLogos.map((logo) => (
              <div key={logo.name} className="text-gray-400 font-semibold text-lg">
                {logo.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}