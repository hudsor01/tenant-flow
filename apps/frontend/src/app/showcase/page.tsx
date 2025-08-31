'use client'

import { GlassCard } from '@/components/ui/glass-card'
import { AnimatedBorder, ShimmerBorder, PulseBorder } from '@/components/ui/animated-border'
import { Skeleton, CardSkeleton, TableSkeleton, TextSkeleton } from '@/components/ui/skeleton-premium'
import { HoverCardPremium, MagneticHover, SpotlightHover, RippleHover } from '@/components/ui/hover-card-premium'
import { SectionTransition, StaggerChildren, FadeInWhenVisible, ScaleInWhenVisible } from '@/components/ui/page-transition'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 py-20">
      <div className="container mx-auto px-6 space-y-24">
        {/* Header */}
        <SectionTransition>
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Premium Component Showcase
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Industry-leading UI components inspired by Linear, Stripe, and modern design systems
            </p>
          </div>
        </SectionTransition>

        {/* Glass Cards Section */}
        <SectionTransition delay={0.1}>
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Glass Morphism Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard variant="default" gradient noise>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">Default Glass</h3>
                  <p className="text-muted-foreground">Premium glass effect with noise texture</p>
                </div>
              </GlassCard>
              
              <GlassCard variant="elevated" glow="moderate">
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">Elevated Glass</h3>
                  <p className="text-muted-foreground">Enhanced depth with glow effect</p>
                </div>
              </GlassCard>
              
              <GlassCard variant="premium" gradient>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">Premium Glass</h3>
                  <p className="text-muted-foreground">Gradient glass with premium feel</p>
                </div>
              </GlassCard>
            </div>
          </div>
        </SectionTransition>

        {/* Animated Borders Section */}
        <SectionTransition delay={0.2}>
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Animated Borders</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnimatedBorder>
                <div className="p-6 bg-background rounded-xl">
                  <h3 className="text-xl font-semibold mb-2">Rotating Gradient</h3>
                  <p className="text-muted-foreground">Stripe-inspired animated border</p>
                </div>
              </AnimatedBorder>
              
              <ShimmerBorder>
                <div className="p-6 bg-background">
                  <h3 className="text-xl font-semibold mb-2">Shimmer Effect</h3>
                  <p className="text-muted-foreground">Linear-style shimmer animation</p>
                </div>
              </ShimmerBorder>
              
              <PulseBorder>
                <div className="p-6 bg-background">
                  <h3 className="text-xl font-semibold mb-2">Pulse Glow</h3>
                  <p className="text-muted-foreground">Pulsing glow border effect</p>
                </div>
              </PulseBorder>
            </div>
          </div>
        </SectionTransition>

        {/* Premium Hover Cards */}
        <SectionTransition delay={0.3}>
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Advanced Hover Interactions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HoverCardPremium>
                <h3 className="text-xl font-semibold mb-2">3D Tilt Card</h3>
                <p className="text-muted-foreground">Hover to see perspective tilt effect with glow</p>
              </HoverCardPremium>
              
              <SpotlightHover className="p-6 border rounded-xl">
                <h3 className="text-xl font-semibold mb-2">Spotlight Follow</h3>
                <p className="text-muted-foreground">Mouse spotlight that follows cursor</p>
              </SpotlightHover>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MagneticHover className="inline-block">
                <Button variant="gradient" size="lg">
                  Magnetic Button
                </Button>
              </MagneticHover>
              
              <RippleHover className="p-6 border rounded-xl cursor-pointer">
                <h3 className="text-xl font-semibold mb-2">Ripple Effect</h3>
                <p className="text-muted-foreground">Click to see ripple animation</p>
              </RippleHover>
            </div>
          </div>
        </SectionTransition>

        {/* Loading States */}
        <SectionTransition delay={0.4}>
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Premium Loading States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Skeleton Variants</h3>
                <Skeleton className="h-12 w-full" variant="shimmer" />
                <Skeleton className="h-12 w-full" variant="pulse" />
                <Skeleton className="h-12 w-full" variant="wave" />
                <Skeleton className="h-12 w-full" variant="gradient" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Content Skeletons</h3>
                <CardSkeleton />
                <TextSkeleton lines={3} />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Table Skeleton</h3>
              <TableSkeleton rows={3} />
            </div>
          </div>
        </SectionTransition>

        {/* Button Variants */}
        <SectionTransition delay={0.5}>
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Enhanced Button Variants</h2>
            <StaggerChildren className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="default">Default</Button>
              <Button variant="gradient">Gradient</Button>
              <Button variant="stripe">Stripe Style</Button>
              <Button variant="linear">Linear Style</Button>
              <Button variant="glass">Glass Effect</Button>
              <Button variant="brand">Brand</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
            </StaggerChildren>
          </div>
        </SectionTransition>

        {/* Animation Showcase */}
        <SectionTransition delay={0.6}>
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Page Transitions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FadeInWhenVisible>
                <div className="p-6 border rounded-xl">
                  <h3 className="text-xl font-semibold mb-2">Fade In Animation</h3>
                  <p className="text-muted-foreground">Smooth fade in when scrolling into view</p>
                </div>
              </FadeInWhenVisible>
              
              <ScaleInWhenVisible>
                <div className="p-6 border rounded-xl">
                  <h3 className="text-xl font-semibold mb-2">Scale In Animation</h3>
                  <p className="text-muted-foreground">Scale up animation on scroll</p>
                </div>
              </ScaleInWhenVisible>
            </div>
          </div>
        </SectionTransition>

        {/* Performance Metrics */}
        <SectionTransition delay={0.7}>
          <GlassCard variant="premium" gradient noise className="max-w-2xl mx-auto">
            <div className="p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold">Design System Achievements</h2>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <motion.div
                    className="text-3xl font-bold text-primary"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                  >
                    100%
                  </motion.div>
                  <p className="text-sm text-muted-foreground mt-1">Modern Stack</p>
                </div>
                <div>
                  <motion.div
                    className="text-3xl font-bold text-primary"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                  >
                    0
                  </motion.div>
                  <p className="text-sm text-muted-foreground mt-1">Console Errors</p>
                </div>
                <div>
                  <motion.div
                    className="text-3xl font-bold text-primary"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1 }}
                  >
                    A+
                  </motion.div>
                  <p className="text-sm text-muted-foreground mt-1">Performance</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </SectionTransition>
      </div>
    </div>
  )
}