"use client"

import { ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/magicui/blur-fade"
import { cn } from "@/lib/utils"

interface MinimalistHeroSectionProps {
  className?: string
}

export function MinimalistHeroSection({ className }: MinimalistHeroSectionProps) {
  return (
    <section className={cn(
      "relative py-24 lg:py-32 bg-white dark:bg-gray-950",
      className
    )}>
      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Main Headline */}
          <BlurFade delay={0.1} inView>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-gray-900 dark:text-white mb-8">
              Property management
              <br />
              <span className="text-indigo-600 dark:text-indigo-400">simplified</span>
            </h1>
          </BlurFade>

          {/* Subtitle */}
          <BlurFade delay={0.2} inView>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
              The complete platform for property managers who want to focus on what matters most—
              growing their business, not managing spreadsheets.
            </p>
          </BlurFade>

          {/* CTA Buttons */}
          <BlurFade delay={0.3} inView>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button
                size="lg" 
                className="px-8 py-4 text-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                Start free trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className="px-8 py-4 text-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                View demo
              </Button>
            </div>
          </BlurFade>

          {/* Trust Indicators */}
          <BlurFade delay={0.4} inView>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400 mb-20">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </BlurFade>

          {/* Clean Dashboard Preview */}
          <BlurFade delay={0.5} inView>
            <div className="relative">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
                {/* Browser Chrome */}
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <div className="ml-4 text-sm text-gray-500 font-mono">tenantflow.app</div>
                  </div>
                </div>
                
                {/* Dashboard Content */}
                <div className="p-8 aspect-video bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h2>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg"></div>
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                    </div>
                  </div>
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Properties', value: '24', change: '+12%' },
                      { label: 'Units', value: '156', change: '+8%' },
                      { label: 'Occupied', value: '142', change: '+5%' },
                      { label: 'Revenue', value: '$47K', change: '+15%' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                        <div className="text-xl font-semibold text-gray-900 dark:text-white">{stat.value}</div>
                        <div className="text-xs text-green-600">{stat.change}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart Area */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 h-32">
                    <div className="flex items-end gap-2 h-full">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="bg-indigo-200 dark:bg-indigo-800 rounded-sm flex-1"
                          style={{ height: `${Math.random() * 80 + 20}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}