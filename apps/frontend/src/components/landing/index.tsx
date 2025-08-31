/**
 * Consolidated Landing Page Components
 * 
 * This file consolidates all landing page components into a single, 
 * maintainable system following DRY and KISS principles.
 */

'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { 
  ArrowRight, Play, Check, Star, ChevronRight, Sparkles, 
  TrendingUp, Zap, Building, Users, DollarSign, Home,
  Wrench, FileText, CheckCircle, Mail, Phone, MapPin
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import {
  NumberTicker,
  AnimatedGradientText,
  BorderBeam,
  GridPattern,
  Meteors,
  BlurFade,
  RainbowButton,
  Ripple
} from '@/components/magicui'

// ==========================================
// HERO SECTION COMPONENT
// ==========================================

interface HeroSectionProps {
  variant?: 'standard' | 'premium'
  title?: string
  subtitle?: string
  ctaText?: string
  demoText?: string
  trustIndicators?: string[]
}

export function HeroSection({ 
  variant = 'standard',
  title = 'Manage Properties Like Never Before',
  subtitle = 'The AI-powered property management platform that automates operations, predicts maintenance, and maximizes your ROI with intelligent insights.',
  ctaText = 'Start Free Trial',
  demoText = 'Watch Demo',
  trustIndicators = ['14-day free trial', 'No credit card required', 'Cancel anytime']
}: HeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Parallax effects for premium variant
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -25])
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -100])

  const isPremium = variant === 'premium'

  return (
    <section 
      ref={containerRef}
      className={cn(
        "relative min-h-[100vh] flex items-center justify-center overflow-hidden pt-20 pb-32",
        isPremium ? "bg-black text-white" : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
      )}
    >
      {/* Premium Background Effects */}
      {isPremium && (
        <>
          <motion.div 
            className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950"
            style={{ y: backgroundY }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
          </motion.div>
          
          <motion.div 
            className="absolute inset-0"
            style={{ y: gridY }}
          >
            <GridPattern
              className="absolute inset-0 opacity-40 fill-blue-400/20 stroke-blue-400/20"
              width={40}
              height={40}
              maxOpacity={0.3}
            />
          </motion.div>
          
          <Meteors number={20} />
        </>
      )}

      <div className="container relative z-10 mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Trust Badge */}
          <BlurFade delay={0.1} inView>
            <AnimatedGradientText className="mb-6">
              <Sparkles className="mr-2 h-4 w-4" />
              Trusted by 10,000+ property managers
              <ChevronRight className="ml-2 h-4 w-4" />
            </AnimatedGradientText>
          </BlurFade>

          {/* Main Title */}
          <BlurFade delay={0.2} inView>
            <h1 className={cn(
              "font-bold tracking-[-0.02em] leading-[0.95] mb-8",
              isPremium 
                ? "text-[3rem] md:text-[5rem] lg:text-[6rem]" 
                : "text-[2.5rem] md:text-[4rem] lg:text-[5rem]"
            )}>
              <span className={cn(
                "block",
                isPremium ? "text-white" : "text-gray-900"
              )}>
                {title.split(' ').slice(0, 2).join(' ')}
              </span>
              <span className={cn(
                "block mt-2 bg-gradient-to-r bg-clip-text text-transparent",
                isPremium 
                  ? "from-blue-400 via-violet-400 to-cyan-400" 
                  : "from-blue-600 to-purple-600"
              )}>
                {title.split(' ').slice(2).join(' ')}
              </span>
            </h1>
          </BlurFade>

          {/* Subtitle */}
          <BlurFade delay={0.3} inView>
            <p className={cn(
              "text-lg md:text-xl mb-12 max-w-[42rem] mx-auto leading-[1.7]",
              isPremium ? "text-gray-400" : "text-gray-600"
            )}>
              {subtitle}
            </p>
          </BlurFade>

          {/* CTA Buttons */}
          <BlurFade delay={0.4} inView>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RainbowButton>
                  <span className="flex items-center gap-2 font-medium">
                    {ctaText}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </RainbowButton>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  size="lg"
                  variant="outline"
                  className={cn(
                    "px-7 py-3 h-12 text-base font-medium transition-all duration-300",
                    isPremium 
                      ? "border-white/20 text-white hover:bg-white/10 backdrop-blur-sm" 
                      : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {demoText}
                  <span className="ml-1.5 text-gray-500">(2 min)</span>
                </Button>
              </motion.div>
            </div>
          </BlurFade>

          {/* Trust Indicators */}
          <BlurFade delay={0.5} inView>
            <div className={cn(
              "flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm",
              isPremium ? "text-gray-400" : "text-gray-600"
            )}>
              {trustIndicators.map((indicator, index) => (
                <motion.div 
                  key={indicator}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">{indicator}</span>
                </motion.div>
              ))}
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}

// ==========================================
// FEATURES SECTION COMPONENT
// ==========================================

interface Feature {
  icon: typeof Building
  title: string
  description: string
  gradient: string
}

interface FeaturesSectionProps {
  title?: string
  subtitle?: string
  features?: Feature[]
}

export function FeaturesSection({
  title = "Everything You Need to Scale Your Business",
  subtitle = "Built for modern property management teams who demand excellence",
  features = [
    {
      icon: Building,
      title: "Property Management",
      description: "Centralized dashboard to manage all your properties, track occupancy, and monitor performance metrics in real-time.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Users,
      title: "Tenant Portal",
      description: "Self-service portal for tenants to pay rent, submit maintenance requests, and communicate with management.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Wrench,
      title: "Maintenance Tracking",
      description: "Streamlined maintenance request system with automated scheduling and vendor management.",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: DollarSign,
      title: "Financial Analytics",
      description: "Comprehensive financial reporting with automated rent collection and expense tracking.",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: FileText,
      title: "Document Management",
      description: "Secure cloud storage for leases, contracts, and important property documents.",
      gradient: "from-violet-500 to-purple-500"
    },
    {
      icon: Home,
      title: "Unit Management",
      description: "Track unit availability, rental rates, and maintenance history for optimal property performance.",
      gradient: "from-pink-500 to-rose-500"
    }
  ]
}: FeaturesSectionProps) {
  return (
    <section className="relative py-24 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BlurFade delay={0.1} inView>
          <div className="text-center mb-16">
            <AnimatedGradientText className="mb-4">
              <Zap className="mr-2 h-4 w-4" />
              Platform Features
            </AnimatedGradientText>
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-[-0.01em]">
              {title}
            </h2>
            
            <p className="max-w-3xl mx-auto text-xl text-gray-600 font-[450] leading-[1.7]">
              {subtitle}
            </p>
          </div>
        </BlurFade>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <BlurFade key={index} delay={0.2 + index * 0.05} inView>
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative group h-full"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all" />
                <Card className="relative h-full border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className={cn(
                      "inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-4 bg-gradient-to-r text-white",
                      feature.gradient
                    )}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    
                    <CardTitle className="text-xl font-bold text-gray-900 tracking-[-0.005em]">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-600 leading-[1.6]">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}

// ==========================================
// STATS SECTION COMPONENT
// ==========================================

interface Stat {
  value: number
  suffix?: string
  prefix?: string
  label: string
  gradient: string
}

interface StatsSectionProps {
  title?: string
  stats?: Stat[]
}

export function StatsSection({
  title = "Trusted by Industry Leaders",
  stats = [
    { value: 10000, suffix: '+', label: 'Properties Managed', gradient: 'from-blue-500 to-cyan-500' },
    { value: 98, suffix: '%', label: 'Average Occupancy', gradient: 'from-emerald-500 to-teal-500' },
    { value: 2.5, prefix: '$', suffix: 'M', label: 'Revenue Tracked', gradient: 'from-purple-500 to-pink-500' },
    { value: 24, suffix: 'hr', label: 'Support Response', gradient: 'from-orange-500 to-red-500' }
  ]
}: StatsSectionProps) {
  return (
    <section className="relative py-24 border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BlurFade delay={0.1} inView>
          <div className="text-center mb-16">
            <AnimatedGradientText className="mb-4">
              <TrendingUp className="mr-2 h-4 w-4" />
              Platform Metrics
            </AnimatedGradientText>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-[-0.01em]">
              {title}
            </h2>
          </div>
        </BlurFade>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <BlurFade key={index} delay={0.2 + index * 0.1} inView>
              <motion.div 
                className="relative group"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                <Card className="relative border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
                  <CardContent className="p-8 text-center">
                    <div className={cn(
                      "text-4xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent",
                      stat.gradient
                    )}>
                      {stat.prefix}
                      <NumberTicker value={stat.value} />
                      {stat.suffix}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}

// ==========================================
// TESTIMONIALS SECTION COMPONENT
// ==========================================

interface Testimonial {
  quote: string
  author: string
  role: string
  rating: number
  avatar: string
}

interface TestimonialsSectionProps {
  title?: string
  testimonials?: Testimonial[]
}

export function TestimonialsSection({
  title = "Loved by Property Managers",
  testimonials = [
    {
      quote: "TenantFlow has revolutionized how we manage our portfolio. The automation features alone have saved us 20+ hours per week.",
      author: "Sarah Johnson",
      role: "Portfolio Manager, Urban Properties",
      rating: 5,
      avatar: "SJ"
    },
    {
      quote: "The tenant portal has dramatically reduced our support tickets. Tenants love the self-service options and we love the efficiency.",
      author: "Michael Chen",
      role: "Property Owner, Chen Holdings",
      rating: 5,
      avatar: "MC"
    },
    {
      quote: "Best ROI we've seen on any property management software. The financial reporting alone pays for itself.",
      author: "Emily Rodriguez",
      role: "COO, Coastal Rentals",
      rating: 5,
      avatar: "ER"
    }
  ]
}: TestimonialsSectionProps) {
  return (
    <section className="relative py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BlurFade delay={0.1} inView>
          <div className="text-center mb-16">
            <AnimatedGradientText className="mb-4">
              <Star className="mr-2 h-4 w-4" />
              Customer Stories
            </AnimatedGradientText>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-[-0.01em]">
              {title}
            </h2>
          </div>
        </BlurFade>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <BlurFade key={index} delay={0.2 + index * 0.1} inView>
              <Card className="h-full border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
                <CardContent className="p-8">
                  {/* Rating */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <blockquote className="text-gray-700 text-lg leading-[1.7] mb-6">
                    "{testimonial.quote}"
                  </blockquote>
                  
                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {testimonial.avatar}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-gray-600">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}

// ==========================================
// CTA SECTION COMPONENT
// ==========================================

interface CTASectionProps {
  variant?: 'standard' | 'premium'
  title?: string
  subtitle?: string
  ctaText?: string
  demoText?: string
}

export function CTASection({
  variant = 'standard',
  title = "Transform Your Property Management Today",
  subtitle = "Join thousands of property managers who are already saving time, reducing costs, and growing with TenantFlow.",
  ctaText = "Start Free Trial",
  demoText = "Watch Demo"
}: CTASectionProps) {
  const isPremium = variant === 'premium'
  
  return (
    <section className={cn(
      "relative py-32 overflow-hidden",
      isPremium ? "bg-black text-white border-t border-white/10" : "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
    )}>
      {isPremium && <Ripple />}
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <BlurFade delay={0.1} inView>
          <AnimatedGradientText className="mb-6">
            <Sparkles className="mr-2 h-4 w-4" />
            Ready to Get Started?
          </AnimatedGradientText>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-8">
            {title.split(' ').slice(0, 3).join(' ')}
            <span className={cn(
              "block mt-2 bg-gradient-to-r bg-clip-text text-transparent",
              isPremium 
                ? "from-blue-400 via-purple-400 to-pink-400" 
                : "from-yellow-300 to-orange-300"
            )}>
              {title.split(' ').slice(3).join(' ')}
            </span>
          </h2>
          
          <p className={cn(
            "max-w-3xl mx-auto text-xl mb-12",
            isPremium ? "text-gray-400" : "text-blue-100"
          )}>
            {subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <RainbowButton className="px-8 py-4">
              <span className="flex items-center gap-2 text-lg font-semibold">
                {ctaText}
                <ArrowRight className="h-5 w-5" />
              </span>
            </RainbowButton>
            
            <Button 
              size="lg"
              variant="outline"
              className={cn(
                "px-8 py-4",
                isPremium 
                  ? "border-white/20 text-white hover:bg-white/10" 
                  : "border-white/30 text-white hover:bg-white/20"
              )}
            >
              <Play className="h-4 w-4 mr-2" />
              {demoText}
            </Button>
          </div>
          
          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-8 text-sm",
            isPremium ? "text-gray-400" : "text-blue-100"
          )}>
            {['No credit card required', '14-day free trial', 'Cancel anytime'].map((text, index) => (
              <div key={text} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </BlurFade>
      </div>
    </section>
  )
}

// ==========================================
// FOOTER COMPONENT
// ==========================================

interface FooterProps {
  variant?: 'standard' | 'premium'
}

export function Footer({ variant = 'standard' }: FooterProps) {
  const isPremium = variant === 'premium'
  
  const footerSections = [
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '/features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Security', href: '/security' },
        { name: 'Integrations', href: '/integrations' }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About', href: '/about' },
        { name: 'Blog', href: '/blog' },
        { name: 'Careers', href: '/careers' },
        { name: 'Contact', href: '/contact' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Documentation', href: '/docs' },
        { name: 'Help Center', href: '/help' },
        { name: 'Status', href: '/status' },
        { name: 'API', href: '/api' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy', href: '/privacy' },
        { name: 'Terms', href: '/terms' },
        { name: 'Cookies', href: '/cookies' },
        { name: 'GDPR', href: '/gdpr' }
      ]
    }
  ]

  return (
    <footer className={cn(
      "relative border-t",
      isPremium 
        ? "bg-slate-950/80 backdrop-blur-sm border-white/10 text-white" 
        : "bg-gray-50 border-gray-200 text-gray-900"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className={cn(
                "text-xl font-bold",
                isPremium ? "text-white" : "text-gray-900"
              )}>
                TenantFlow
              </span>
            </Link>
            
            <p className={cn(
              "text-sm mb-6 max-w-xs leading-relaxed",
              isPremium ? "text-gray-400" : "text-gray-600"
            )}>
              The modern property management platform that scales with your business.
            </p>
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className={cn(
                "text-sm",
                isPremium ? "text-gray-400" : "text-gray-600"
              )}>
                All systems operational
              </span>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className={cn(
                "text-sm font-semibold uppercase tracking-wider mb-4",
                isPremium ? "text-gray-300" : "text-gray-900"
              )}>
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className={cn(
                        "text-sm transition-colors",
                        isPremium 
                          ? "text-gray-400 hover:text-white" 
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className={cn(
          "border-t mt-12 pt-8 flex justify-between items-center",
          isPremium ? "border-white/10" : "border-gray-200"
        )}>
          <p className={cn(
            "text-sm",
            isPremium ? "text-gray-500" : "text-gray-600"
          )}>
            © 2024 TenantFlow. All rights reserved.
          </p>
          
          <div className={cn(
            "flex items-center gap-2 text-sm",
            isPremium ? "text-gray-500" : "text-gray-600"
          )}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}

// ==========================================
// NAVIGATION COMPONENT
// ==========================================

interface NavigationProps {
  variant?: 'standard' | 'premium'
  navItems?: { name: string; href: string }[]
}

export function Navigation({ 
  variant = 'standard',
  navItems = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Customers', href: '/customers' },
    { name: 'Resources', href: '/resources' }
  ]
}: NavigationProps) {
  const isPremium = variant === 'premium'
  
  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 border-b",
      isPremium 
        ? "bg-slate-900/30 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]" 
        : "bg-white/80 backdrop-blur-xl border-gray-200 shadow-sm"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              {isPremium && (
                <BorderBeam 
                  size={40}
                  duration={12}
                  borderWidth={2}
                  colorFrom="#3b82f6"
                  colorTo="#8b5cf6"
                />
              )}
            </div>
            <span className={cn(
              "text-xl font-bold transition-colors",
              isPremium ? "text-white group-hover:text-blue-400" : "text-gray-900"
            )}>
              TenantFlow
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link 
                  href={item.href}
                  className={cn(
                    "relative px-4 py-2 text-[14px] font-medium rounded-lg transition-all duration-200 group overflow-hidden",
                    isPremium 
                      ? "text-gray-400 hover:text-white hover:bg-white/5" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <span className="relative z-10">{item.name}</span>
                  {isPremium && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button 
                variant="ghost" 
                className={cn(
                  "hidden md:inline-flex text-[14px] font-medium h-9 px-4",
                  isPremium 
                    ? "text-gray-400 hover:text-white hover:bg-white/5" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Sign In
              </Button>
            </Link>
            
            <Link href="/auth/signup">
              <Button 
                size="sm"
                className={cn(
                  "text-[14px] font-medium h-9 px-4",
                  isPremium 
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

// ==========================================
// MAIN EXPORT
// ==========================================

export default {
  HeroSection,
  FeaturesSection,
  StatsSection,
  TestimonialsSection,
  CTASection,
  Footer,
  Navigation
}