"use client"

import { ArrowRight, Sparkles, Palette, Zap, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/magicui/blur-fade"
import { MagicCard } from "@/components/magicui/magic-card"
import { cn } from "@/lib/utils"

interface CreativeHeroSectionProps {
  className?: string
}

export function CreativeHeroSection({ className }: CreativeHeroSectionProps) {
  return (
    <section className={cn(
      "relative min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-purple-950/20 dark:to-indigo-950/20 overflow-hidden",
      className
    )}>
      {/* Creative background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-pink-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-20 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center min-h-screen justify-center py-20">
          
          {/* Creative badge */}
          <BlurFade delay={0.1} inView>
            <Badge className="mb-8 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <Sparkles className="w-4 h-4 mr-2" />
              Design meets functionality
              <Palette className="w-4 h-4 ml-2" />
            </Badge>
          </BlurFade>

          {/* Creative headline */}
          <BlurFade delay={0.2} inView>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight mb-8 leading-[0.9]">
              <span className="block bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Design your
              </span>
              <span className="block text-gray-900 dark:text-white">
                property empire
              </span>
            </h1>
          </BlurFade>

          {/* Creative description */}
          <BlurFade delay={0.3} inView>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              The most beautiful property management platform ever created. 
              <br />
              <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Where aesthetics meet powerful functionality.
              </span>
            </p>
          </BlurFade>

          {/* Creative CTAs */}
          <BlurFade delay={0.4} inView>
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-16">
              <Button
                size="lg"
                className="px-10 py-5 text-lg font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white rounded-2xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 border-0"
              >
                <Zap className="w-5 h-5 mr-3" />
                Start creating magic
                <ArrowRight className="w-5 h-5 ml-3" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="px-10 py-5 text-lg font-semibold border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-2xl transition-all duration-300 hover:scale-105"
              >
                Explore the gallery
              </Button>
            </div>
          </BlurFade>

          {/* Creative features grid */}
          <BlurFade delay={0.5} inView>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
              {[
                {
                  title: "Stunning Visuals",
                  description: "Every pixel crafted with care",
                  gradient: "from-pink-500 to-rose-500",
                  icon: Palette
                },
                {
                  title: "Smooth Interactions",
                  description: "Butter-smooth animations",
                  gradient: "from-purple-500 to-indigo-500",
                  icon: Sparkles
                },
                {
                  title: "Delightful UX",
                  description: "Joy in every interaction",
                  gradient: "from-blue-500 to-cyan-500",
                  icon: Star
                }
              ].map((feature, index) => (
                <MagicCard key={index} className="group p-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-purple-200/50 dark:border-purple-800/50 rounded-3xl hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20">
                  <feature.icon className="w-10 h-10 mb-4 text-purple-500" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className={cn(
                    "mt-4 h-1 w-0 group-hover:w-full bg-gradient-to-r rounded-full transition-all duration-500",
                    feature.gradient
                  )}></div>
                </MagicCard>
              ))}
            </div>
          </BlurFade>

          {/* Creative interface showcase */}
          <BlurFade delay={0.6} inView>
            <div className="relative max-w-6xl mx-auto">
              <div className="relative">
                {/* Magical glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 rounded-3xl blur-3xl scale-110 animate-pulse"></div>
                
                {/* Main interface */}
                <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-3xl border border-purple-200/50 dark:border-purple-800/50 shadow-2xl overflow-hidden">
                  
                  {/* Creative header */}
                  <div className="flex items-center justify-between p-8 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border-b border-purple-200/30 dark:border-purple-800/30">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">T</span>
                      </div>
                      <span className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        TenantFlow Studio
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button size="sm" variant="ghost" className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400">
                        Gallery
                      </Button>
                      <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 rounded-xl shadow-lg">
                        Create
                      </Button>
                    </div>
                  </div>

                  {/* Creative dashboard content */}
                  <div className="p-8">
                    {/* Colorful metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      {[
                        { metric: '247', label: 'Properties', color: 'from-pink-500 to-rose-500' },
                        { metric: '94.2%', label: 'Occupancy', color: 'from-purple-500 to-indigo-500' },
                        { metric: '$324K', label: 'Revenue', color: 'from-blue-500 to-cyan-500' },
                        { metric: '+18%', label: 'Growth', color: 'from-emerald-500 to-teal-500' }
                      ].map((stat, i) => (
                        <div key={i} className={cn(
                          "p-6 rounded-2xl bg-gradient-to-br text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105",
                          stat.color
                        )}>
                          <div className="text-2xl font-bold mb-1">{stat.metric}</div>
                          <div className="text-sm opacity-90">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Artistic chart */}
                    <div className="bg-gradient-to-br from-gray-50 to-purple-50/50 dark:from-gray-800 dark:to-purple-900/20 rounded-2xl p-6">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        Creative Performance Dashboard
                      </div>
                      <div className="flex items-end justify-center gap-2 h-32">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "rounded-t-lg flex-1 transition-all duration-500 hover:opacity-80",
                              i % 4 === 0 ? "bg-gradient-to-t from-pink-400 to-pink-500" :
                              i % 4 === 1 ? "bg-gradient-to-t from-purple-400 to-purple-500" :
                              i % 4 === 2 ? "bg-gradient-to-t from-blue-400 to-blue-500" :
                              "bg-gradient-to-t from-cyan-400 to-cyan-500"
                            )}
                            style={{ 
                              height: `${Math.random() * 80 + 20}%`,
                              animationDelay: `${i * 100}ms`
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating creative elements */}
                <div className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full shadow-lg animate-bounce"></div>
                <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full shadow-lg animate-pulse"></div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}