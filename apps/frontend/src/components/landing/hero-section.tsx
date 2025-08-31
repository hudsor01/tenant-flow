/**
 * Hero Section - MagicUI Enhanced
 * Premium animated components for stunning visual impact
 */

"use client";

import { 
  AnimatedGradientText, 
  BlurFade, 
  ShimmerButton, 
  RainbowButton, 
  Ripple,
  GridPattern,
  BorderBeam,
  Meteors,
  NumberTicker
} from '@/components/magicui'
import { BORDER_BEAM_PRESETS } from '@/lib/animations/constants'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useMemo } from 'react'
import { MagneticButton } from '@/components/ui/magnetic-button'
import { AnimatedTextHighlight } from '@/components/ui/animated-text-reveal'
import { useOptimizedAnimations } from '@/hooks/use-mobile-animations'

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  })
  
  // Mobile-optimized parallax effects
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]) // Reduced parallax on mobile
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.9, 0.5])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.98])

  return (
    <section ref={ref} className="relative min-h-screen overflow-hidden flex items-center justify-center pt-16">
      {/* Animated Backgrounds */}
      
      <GridPattern
        numSquares={50}
        className="[mask-image:radial-gradient(400px_circle_at_center,white,transparent)] inset-x-0 inset-y-[-30%] h-[200%] skew-y-12"
      />

      {/* Premium Meteors Effect */}
      <Meteors number={30} />

      {/* Ripple Effect */}
      <Ripple 
        mainCircleSize={210}
        mainCircleOpacity={0.15}
        numCircles={8}
      />

      <motion.div 
        style={{ y, opacity, scale }}
        className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl text-center">
          
          {/* Animated Badge */}
          <BlurFade delay={0.1}>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative mb-8 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-card/50 backdrop-blur-sm px-4 py-2 text-sm shadow-lg"
            >
              <BorderBeam {...BORDER_BEAM_PRESETS.MEDIUM} />
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-medium">🏢 Modern Property Management Platform</span>
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ✨
              </motion.div>
            </motion.div>
          </BlurFade>

          {/* Main Heading with Animated Text */}
          <BlurFade delay={0.2} className="mb-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block mb-2">Manage Properties,</span>
              <AnimatedGradientText className="text-4xl sm:text-6xl lg:text-7xl">
                Tenants & Leases
              </AnimatedGradientText>
            </h1>
          </BlurFade>

          {/* Premium Animated Subtitle */}
          <BlurFade delay={0.3}>
            <div className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              <AnimatedTextHighlight
                delay={0.4}
                highlight={["real-time occupancy tracking", "comprehensive analytics", "intelligent"]}
                className="text-lg leading-8"
              >
                Streamline your property portfolio with real-time occupancy tracking, intelligent maintenance management, and comprehensive analytics that drive results.
              </AnimatedTextHighlight>
            </div>
          </BlurFade>

          {/* Enhanced CTAs with Magnetic Interaction */}
          <BlurFade delay={0.4}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <MagneticButton strength={0.3}>
                <RainbowButton 
                  size="lg"
                  className="text-white font-semibold px-8 py-3 text-lg transform-gpu"
                >
                  Start Free Trial
                </RainbowButton>
              </MagneticButton>
              
              <MagneticButton strength={0.25}>
                <ShimmerButton 
                  className="px-8 py-3 text-lg font-semibold transform-gpu"
                  shimmerColor="#3b82f6"
                  background="rgba(59, 130, 246, 0.1)"
                >
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      ⚡
                    </motion.div>
                    Watch Demo
                  </span>
                </ShimmerButton>
              </MagneticButton>
            </div>
          </BlurFade>

          {/* Animated Trust Indicators */}
          <BlurFade delay={0.5}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 text-sm"
            >
              {[
                { icon: "🛡️", text: "Enterprise Security", delay: 0.1 },
                { icon: "⚡", text: "Real-time Analytics", delay: 0.2 },
                { icon: "🚀", text: "Multi-tenant Ready", delay: 0.3 }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + item.delay }}
                  className="flex items-center justify-center gap-3 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm px-4 py-3 font-medium text-muted-foreground hover:bg-card/50 transition-all duration-300"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </BlurFade>

          {/* Stats Section */}
          <BlurFade delay={0.6}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-20 grid grid-cols-2 gap-6 sm:grid-cols-4"
            >
              {[
                { value: "10000", label: "Properties Managed", suffix: "+" },
                { value: "99.9", label: "Uptime Guarantee", suffix: "%" },
                { value: "24", label: "Support Response", suffix: "hr" },
                { value: "2500000", label: "Revenue Tracked", prefix: "$", format: "currency" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl font-bold text-primary lg:text-3xl">
                    {stat.prefix && <span>{stat.prefix}</span>}
                    <NumberTicker 
                      value={stat.format === "currency" ? 2.5 : parseFloat(stat.value)} 
                      direction="up"
                      delay={1.2 + index * 0.1}
                      className="inline-block"
                    />
                    {stat.format === "currency" && <span>M</span>}
                    {stat.suffix && <span>{stat.suffix}</span>}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </BlurFade>
        </div>
      </motion.div>
    </section>
  )
}
