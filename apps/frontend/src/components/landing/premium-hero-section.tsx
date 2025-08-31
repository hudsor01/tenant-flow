'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Play, Check } from 'lucide-react'
import { NumberTicker } from '@/components/magicui'

/**
 * Simplified Premium Hero Section
 * Focus on clean design and performance over complex animations
 */
export function PremiumHeroSection() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden pt-20 pb-32">
      {/* Simplified Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900" />
      
      <div className="container relative z-10 mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-1.5 mb-12">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium tracking-wide text-gray-700 dark:text-gray-300">Trusted by 10,000+ property managers</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-[2.5rem] md:text-[4rem] lg:text-[5rem] font-bold tracking-[-0.02em] leading-[0.95] mb-8">
            <span className="text-gray-900 dark:text-white block">Manage Properties,</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block mt-2">
              Tenants & Leases
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-[42rem] mx-auto leading-[1.7]">
            The modern property management platform that streamlines operations, 
            maximizes revenue, and delivers exceptional tenant experiences.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link href="/sign-up">
              <Button 
                size="lg"
                className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-7 py-3 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span className="flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
            <Button 
              size="lg"
              variant="outline"
              className="px-7 py-3 h-12 text-base font-medium border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-300"
            >
              <Play className="w-4 h-4 mr-2" />
              Watch Demo
              <span className="ml-1.5 text-gray-500 dark:text-gray-400">(2 min)</span>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="font-medium">14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="font-medium">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="font-medium">Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 max-w-5xl mx-auto">
          {[
            { label: 'Properties Managed', value: 10000, suffix: '+' },
            { label: 'Average Occupancy', value: 98, suffix: '%' },
            { label: 'Revenue Tracked', value: 2.5, prefix: '$', suffix: 'M' },
            { label: 'Support Response', value: 24, suffix: 'hr' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                {stat.prefix}
                <NumberTicker value={stat.value} className="tabular-nums" />
                {stat.suffix}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Preview */}
        <div className="mt-32 relative">
          <div className="relative mx-auto max-w-7xl px-4">
            <div className="relative rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl overflow-hidden">
              <div className="p-1 md:p-2">
                <div className="aspect-[16/9] rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                  <span className="text-xl text-gray-500 dark:text-gray-400 font-medium">Dashboard Preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
