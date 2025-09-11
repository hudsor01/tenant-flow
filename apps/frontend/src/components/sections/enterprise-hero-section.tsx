"use client"

import { ArrowRight, TrendingUp, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/magicui/blur-fade"
import { cn } from "@/lib/utils"

interface EnterpriseHeroSectionProps {
  className?: string
}

export function EnterpriseHeroSection({ className }: EnterpriseHeroSectionProps) {
  return (
    <section className={cn(
      "relative py-20 lg:py-28 bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800",
      className
    )}>
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Content */}
          <div className="max-w-2xl">
            
            {/* Trust Badge */}
            <BlurFade delay={0.1} inView>
              <Badge variant="outline" className="mb-6 px-4 py-2 bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                <Shield className="w-4 h-4 mr-2" />
                SOC 2 Type II Certified
              </Badge>
            </BlurFade>

            {/* Headline */}
            <BlurFade delay={0.2} inView>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 leading-tight">
                Enterprise Property
                <span className="text-blue-600 dark:text-blue-400 block">
                  Management Platform
                </span>
              </h1>
            </BlurFade>

            {/* Value Proposition */}
            <BlurFade delay={0.3} inView>
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                Scale your property management operations with enterprise-grade security, 
                advanced analytics, and seamless integrations. Trusted by Fortune 500 
                companies and industry leaders worldwide.
              </p>
            </BlurFade>

            {/* Key Stats */}
            <BlurFade delay={0.4} inView>
              <div className="grid grid-cols-3 gap-8 mb-10">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">500K+</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Units Managed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">99.9%</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Uptime SLA</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">50+</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Integrations</div>
                </div>
              </div>
            </BlurFade>

            {/* CTA Buttons */}
            <BlurFade delay={0.5} inView>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  size="lg" 
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Schedule Enterprise Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  className="px-8 py-4 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 font-semibold rounded-lg"
                >
                  View Documentation
                </Button>
              </div>
            </BlurFade>

            {/* Enterprise Features */}
            <BlurFade delay={0.6} inView>
              <div className="flex flex-wrap gap-6 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Single Sign-On (SSO)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Advanced API Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Dedicated Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Custom Integrations</span>
                </div>
              </div>
            </BlurFade>
          </div>

          {/* Right Content - Professional Dashboard */}
          <BlurFade delay={0.7} inView>
            <div className="relative">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">Enterprise Dashboard</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 bg-slate-200 dark:bg-slate-600 rounded"></div>
                      <div className="w-6 h-6 bg-slate-200 dark:bg-slate-600 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                      <div className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-medium mb-1">
                        Portfolio Value
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">$45.2M</div>
                      <div className="text-xs text-green-600 dark:text-green-400">+12.5% YoY</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-medium mb-1">
                        Occupancy Rate
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">94.8%</div>
                      <div className="text-xs text-green-600 dark:text-green-400">+2.1% QoQ</div>
                    </div>
                  </div>

                  {/* Table Header */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Property Performance</h3>
                      <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                        View All
                      </Button>
                    </div>
                    
                    {/* Mock Table */}
                    <div className="space-y-2">
                      {[
                        { property: 'Downtown Plaza', units: 45, occupancy: '96%', revenue: '$125K' },
                        { property: 'Garden Heights', units: 32, occupancy: '88%', revenue: '$98K' },
                        { property: 'Metro Commons', units: 28, occupancy: '100%', revenue: '$110K' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white text-sm">{item.property}</div>
                            <div className="text-xs text-slate-500">{item.units} units</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-slate-900 dark:text-white text-sm">{item.revenue}</div>
                            <div className="text-xs text-slate-500">{item.occupancy}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Revenue Trend (12M)</div>
                    <div className="flex items-end gap-1 h-16">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="bg-blue-500 rounded-sm flex-1"
                          style={{ height: `${Math.random() * 70 + 30}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Security Badge */}
              <div className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">SOC 2 Compliant</span>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}