"use client"

import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/magicui/blur-fade"
import { cn } from "@/lib/utils"

interface LuxuryHeroSectionProps {
  className?: string
}

export function LuxuryHeroSection({ className }: LuxuryHeroSectionProps) {
  return (
    <section className={cn(
      "relative min-h-screen bg-black overflow-hidden",
      className
    )}>
      {/* Subtle spotlight effect */}
      <div className="absolute inset-0 bg-gradient-radial from-zinc-800/20 via-transparent to-transparent"></div>
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center min-h-screen justify-center py-20">
          
          {/* Premium Headline */}
          <BlurFade delay={0.2} inView>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-light tracking-tight text-white mb-12 leading-[0.95]">
              <span className="block">Property management.</span>
              <span className="block">Elevated.</span>
            </h1>
          </BlurFade>

          {/* Elegant Subtitle */}
          <BlurFade delay={0.3} inView>
            <p className="text-xl sm:text-2xl lg:text-3xl text-zinc-400 mb-16 max-w-4xl mx-auto font-light leading-relaxed">
              Experience the most advanced property management platform. 
              <br />
              Precision-engineered for excellence.
            </p>
          </BlurFade>

          {/* Refined CTA */}
          <BlurFade delay={0.4} inView>
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-20">
              <Button
                size="lg"
                className="px-10 py-5 text-lg font-normal bg-white text-black hover:bg-zinc-100 rounded-full transition-all duration-300 hover:scale-[1.02]"
              >
                Experience TenantFlow
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className="px-10 py-5 text-lg font-normal text-white hover:text-zinc-300 rounded-full border border-zinc-700 hover:border-zinc-600 transition-all duration-300"
              >
                <Play className="w-5 h-5 mr-3" />
                Watch the film
              </Button>
            </div>
          </BlurFade>

          {/* Premium Product Showcase */}
          <BlurFade delay={0.5} inView>
            <div className="relative max-w-6xl mx-auto">
              {/* Main Device */}
              <div className="relative">
                {/* Ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-600/10 to-transparent rounded-[3rem] blur-3xl scale-110"></div>
                
                {/* Device frame */}
                <div className="relative bg-zinc-900 rounded-[2.5rem] p-1 shadow-2xl border border-zinc-800">
                  <div className="bg-black rounded-[2.25rem] overflow-hidden">
                    
                    {/* Screen content */}
                    <div className="aspect-video bg-black relative overflow-hidden">
                      {/* Menu bar */}
                      <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-800/50">
                        <div className="text-white text-lg font-light">TenantFlow</div>
                        <div className="flex items-center gap-6 text-sm text-zinc-400">
                          <span className="hover:text-white cursor-pointer transition-colors">Portfolio</span>
                          <span className="hover:text-white cursor-pointer transition-colors">Analytics</span>
                          <span className="hover:text-white cursor-pointer transition-colors">Settings</span>
                        </div>
                      </div>

                      {/* Hero content area */}
                      <div className="p-8 h-full flex flex-col">
                        
                        {/* Elegant stats */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                          <div className="text-center lg:text-left">
                            <div className="text-5xl lg:text-6xl font-ultralight text-white mb-2">247</div>
                            <div className="text-zinc-500 text-sm font-light tracking-wide uppercase">Properties</div>
                          </div>
                          <div className="text-center lg:text-left">
                            <div className="text-5xl lg:text-6xl font-ultralight text-white mb-2">94.2%</div>
                            <div className="text-zinc-500 text-sm font-light tracking-wide uppercase">Occupancy</div>
                          </div>
                          <div className="text-center lg:text-left">
                            <div className="text-5xl lg:text-6xl font-ultralight text-white mb-2">$2.4M</div>
                            <div className="text-zinc-500 text-sm font-light tracking-wide uppercase">Annual Revenue</div>
                          </div>
                        </div>

                        {/* Minimalist chart */}
                        <div className="flex-1 flex items-end justify-center">
                          <div className="flex items-end gap-3 h-24 w-full max-w-md">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <div 
                                key={i} 
                                className="bg-gradient-to-t from-zinc-700 to-zinc-600 rounded-sm flex-1 transition-all duration-500 hover:from-zinc-600 hover:to-zinc-500"
                                style={{ 
                                  height: `${Math.random() * 70 + 30}%`,
                                  animationDelay: `${i * 50}ms`
                                }}
                              ></div>
                            ))}
                          </div>
                        </div>

                        {/* Refined list */}
                        <div className="space-y-3 mt-8">
                          {[
                            'Metro Heights - Lease renewal completed',
                            'Downtown Plaza - Maintenance scheduled', 
                            'Garden Commons - New tenant onboarded'
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-900/50 transition-all cursor-pointer">
                              <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full"></div>
                              <span className="text-zinc-300 text-sm font-light">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating secondary device */}
                <div className="absolute -right-16 -bottom-16 lg:-right-20 lg:-bottom-20 w-72 lg:w-80">
                  <div className="bg-zinc-900 rounded-[1.5rem] p-1 shadow-2xl border border-zinc-800 transform rotate-6 hover:rotate-3 transition-transform duration-500">
                    <div className="bg-black rounded-[1.25rem] overflow-hidden">
                      <div className="aspect-[9/16] p-6" style={{aspectRatio: '9/16'}}>
                        <div className="text-white text-sm font-light mb-6">Mobile Dashboard</div>
                        
                        <div className="space-y-4">
                          <div className="bg-zinc-900 rounded-xl p-4">
                            <div className="text-white text-2xl font-light mb-1">$47,500</div>
                            <div className="text-zinc-500 text-xs">Monthly Revenue</div>
                          </div>
                          
                          <div className="bg-zinc-900 rounded-xl p-4">
                            <div className="text-white text-2xl font-light mb-1">12</div>
                            <div className="text-zinc-500 text-xs">Active Listings</div>
                          </div>
                          
                          <div className="bg-zinc-900 rounded-xl p-4">
                            <div className="text-white text-2xl font-light mb-1">3</div>
                            <div className="text-zinc-500 text-xs">Pending Tasks</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>

          {/* Luxury footer */}
          <BlurFade delay={0.6} inView>
            <div className="mt-24 text-center">
              <p className="text-zinc-600 text-sm font-light mb-6">
                Available on all platforms
              </p>
              <div className="flex items-center justify-center gap-8 opacity-60">
                {['macOS', 'iOS', 'Windows', 'Android', 'Web'].map((platform, i) => (
                  <div key={i} className="text-zinc-500 text-xs font-light tracking-wide uppercase">
                    {platform}
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}