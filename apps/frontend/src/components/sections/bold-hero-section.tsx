"use client"

import { ArrowRight, Zap, Star, Rocket, Target, DollarSign, Clock, TrendingUp, Building2, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/magicui/blur-fade"
import { MagicCard } from "@/components/magicui/magic-card"
import { 
  cn, 
  buttonClasses,
  cardClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE 
} from "@/lib/utils"

interface BoldHeroSectionProps {
  className?: string
}

export function BoldHeroSection({ className }: BoldHeroSectionProps) {
  return (
    <section className={cn(
      "relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden",
      className
    )}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center min-h-screen justify-center py-24">
          
          {/* Announcement Banner */}
          <BlurFade delay={0.1} inView>
            <Badge className="mb-8 px-6 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold text-sm animate-bounce">
              <Star className="w-4 h-4 mr-2 fill-current" />
              #1 Property Management Platform 2024
              <Zap className="w-4 h-4 ml-2" />
            </Badge>
          </BlurFade>

          {/* Massive Headline */}
          <BlurFade delay={0.2} inView>
            <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight mb-8">
              <span className="block text-white">MANAGE</span>
              <span className="block bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                PROPERTIES
              </span>
              <span className="block text-white">LIKE A PRO</span>
            </h1>
          </BlurFade>

          {/* Bold Subtitle */}
          <BlurFade delay={0.3} inView>
            <p className="text-xl sm:text-2xl lg:text-3xl text-cyan-100 mb-12 max-w-4xl mx-auto font-bold leading-relaxed">
              <Rocket className="inline w-8 h-8 mr-3 text-yellow-300" /> 
              The ULTIMATE property management platform that ACTUALLY works!
              <br />
              <span className="text-yellow-300">Stop wasting time. Start making money.</span>
            </p>
          </BlurFade>

          {/* Explosive CTA Section */}
          <BlurFade delay={0.4} inView>
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-16">
              <Button
                size="lg"
                className="px-12 py-6 text-xl font-black bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 hover:scale-110 animate-pulse"
              >
                <Zap className="w-6 h-6 mr-3" />
                START FREE NOW
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="px-12 py-6 text-xl font-bold border-4 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black rounded-full transition-all duration-300 hover:scale-105"
              >
                <Target className="w-6 h-6 mr-3" />
                WATCH DEMO
              </Button>
            </div>
          </BlurFade>

          {/* Attention-Grabbing Benefits */}
          <BlurFade delay={0.5} inView>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
              {[
                { icon: Clock, text: "INSTANT SETUP", subtext: "Ready in 60 seconds" },
                { icon: DollarSign, text: "BOOST PROFITS", subtext: "Average 40% increase" },
                { icon: Target, text: "ZERO HASSLE", subtext: "We handle everything" }
              ].map((benefit, index) => (
                <MagicCard key={index} className="p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl hover:scale-105 transition-all duration-300">
                  <benefit.icon className="w-10 h-10 mb-3 text-yellow-300" />
                  <div className="text-xl font-black text-white mb-2">{benefit.text}</div>
                  <div className="text-cyan-200 font-medium">{benefit.subtext}</div>
                </MagicCard>
              ))}
            </div>
          </BlurFade>

          {/* Explosive Dashboard Preview */}
          <BlurFade delay={0.6} inView>
            <div className="relative max-w-6xl mx-auto">
              <div className="relative bg-black/50 backdrop-blur-sm rounded-3xl border-4 border-purple-500 shadow-2xl overflow-hidden">
                {/* Glowing border effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
                
                <div className="relative bg-gray-900 rounded-3xl p-8">
                  {/* Mock Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="text-2xl font-black text-white flex items-center">
                      <Building2 className="w-8 h-8 mr-3 text-purple-400" />
                      TENANTFLOW COMMAND CENTER
                    </div>
                    <div className="flex gap-3">
                      <Circle className="w-4 h-4 fill-red-500 text-red-500 animate-pulse" />
                      <Circle className="w-4 h-4 fill-yellow-500 text-yellow-500 animate-pulse delay-100" />
                      <Circle className="w-4 h-4 fill-green-500 text-green-500 animate-pulse delay-200" />
                    </div>
                  </div>
                  
                  {/* Explosive Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                      { label: 'PROPERTIES', value: '247', color: 'from-purple-500 to-pink-500' },
                      { label: 'TENANTS', value: '1.2K', color: 'from-cyan-500 to-blue-500' },
                      { label: 'REVENUE', value: '$2.4M', color: 'from-yellow-500 to-orange-500' },
                      { label: 'PROFIT', value: '+47%', color: 'from-green-500 to-emerald-500' }
                    ].map((stat, i) => (
                      <div key={i} className={cn(
                        "p-4 rounded-2xl bg-gradient-to-br text-white text-center font-black shadow-lg",
                        stat.color
                      )}>
                        <div className="text-xs mb-1">{stat.label}</div>
                        <div className="text-2xl lg:text-3xl">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Dynamic Chart */}
                  <div className="bg-gray-800 rounded-2xl p-6">
                    <div className="text-white font-bold mb-4 flex items-center">
                      <TrendingUp className="w-6 h-6 mr-2 text-green-400" />
                      INSANE GROWTH TRACKER
                    </div>
                    <div className="flex items-end gap-2 h-24">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="bg-gradient-to-t from-purple-500 to-cyan-400 rounded-t flex-1 animate-pulse"
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
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}