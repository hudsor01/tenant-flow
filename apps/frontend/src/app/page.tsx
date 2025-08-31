'use client'

import { ArrowRight, Sparkles, Play, Check, TrendingUp, Zap, Star, Building, Users, DollarSign, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  NumberTicker, 
  AnimatedGradientText,
  BorderBeam,
  GridPattern,
  Meteors,
  BlurFade,
  RainbowButton,
  ShimmerButton,
  Ripple
} from '@/components/magicui'
import { cn } from '@/lib/utils'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState } from 'react'

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [_showConfetti, _setShowConfetti] = useState(false)
  
  // Parallax scroll effects
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })
  
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -100])
  const meteorsY = useTransform(scrollYProgress, [0, 1], [0, -50])
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -25])
  
  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated gradient background with parallax */}
      <motion.div 
        className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950"
        style={{ y: backgroundY }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.08),transparent_50%)]" />
      </motion.div>
      
      {/* Grid Pattern Background with Parallax */}
      <motion.div 
        className="absolute inset-0"
        style={{ y: gridY }}
      >
        <GridPattern
          className="absolute inset-0 opacity-40 fill-blue-400/20 stroke-blue-400/20"
          width={40}
          height={40}
          _maxOpacity={0.3}
        />
      </motion.div>
      
      {/* Premium Navigation with Glass Morphism */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/30 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <BorderBeam 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  size={60}
                  duration={3}
                  colorFrom="#3b82f6"
                  colorTo="#8b5cf6"
                />
              </div>
              <span className="font-bold text-lg text-white">TenantFlow</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {[
                { name: 'Features', href: '/features' },
                { name: 'Pricing', href: '/pricing' },
                { name: 'Customers', href: '/customers' },
                { name: 'Resources', href: '/resources' }
              ].map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link 
                    href={item.href}
                    className="relative px-4 py-2 text-[14px] font-medium text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200 group overflow-hidden"
                  >
                    <span className="relative z-10">{item.name}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="hidden md:inline-flex text-[14px] font-medium text-gray-400 hover:text-white hover:bg-white/5 h-9 px-4">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <ShimmerButton className="shadow-2xl">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    Start Free Trial
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </ShimmerButton>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Hero Section with Animated Elements */}
      <section className="relative min-h-[100vh] flex items-center justify-center">
        {/* Animated Meteors Background */}
        <motion.div
          className="absolute inset-0"
          style={{ y: meteorsY }}
        >
          <Meteors number={20} />
        </motion.div>
        
        <div className="container relative z-10 mx-auto px-6 lg:px-8">
          <BlurFade delay={0.1} inView>
            <div className="mx-auto max-w-4xl text-center">
              {/* Animated Badge */}
              <AnimatedGradientText className="mb-8">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Trusted by 10,000+ property managers</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </AnimatedGradientText>

              {/* Main Heading with Gradient */}
              <h1 className="text-[3rem] md:text-[5rem] lg:text-[6rem] font-bold tracking-[-0.02em] leading-[0.95] mb-8">
                <span className="block text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">Manage Properties</span>
                <span className="block mt-2 bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent bg-300% drop-shadow-[0_4px_24px_rgba(59,130,246,0.3)]" 
                      style={{ backgroundSize: '300% 300%', animation: 'gradient-x 3s ease infinite' }}>
                  Like Never Before
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-gray-400/90 mb-12 max-w-[42rem] mx-auto leading-[1.75] font-[450]">
                The AI-powered property management platform that automates operations, 
                predicts maintenance, and maximizes your ROI with intelligent insights.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RainbowButton>
                    <span className="flex items-center gap-2 font-medium">
                      Start Free Trial
                      <motion.div
                        initial={{ x: 0 }}
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.div>
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
                    className="relative border-white/20 text-white hover:bg-white/10 backdrop-blur-sm overflow-hidden group"
                  >
                    <Play className="h-4 w-4 mr-2 relative z-10" />
                    <span className="relative z-10">Watch Demo</span>
                    <span className="ml-1.5 text-gray-400 relative z-10">(2 min)</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Button>
                </motion.div>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-gray-400">
                {[
                  { text: '14-day free trial' },
                  { text: 'No credit card required' },
                  { text: 'Cancel anytime' }
                ].map((item, index) => (
                  <motion.div 
                    key={item.text}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.2 + index * 0.1, type: "spring", stiffness: 300 }}
                    >
                      <Check className="h-4 w-4 text-emerald-400" />
                    </motion.div>
                    <span>{item.text}</span>
                  </motion.div>
                ))}</div>
            </div>
          </BlurFade>

          {/* Dashboard Preview with Glass Morphism */}
          <BlurFade delay={0.3} inView>
            <div className="mt-24 relative">
              <div className="relative mx-auto max-w-6xl">
                <motion.div 
                  className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_25px_50px_rgba(0,0,0,0.25)] overflow-hidden"
                  animate={{ 
                    y: [0, -8, 0] 
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <BorderBeam 
                    size={250}
                    duration={12}
                    delay={3}
                  />
                  <div className="p-2">
                    <div className="aspect-[16/9] rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                      <div className="grid grid-cols-3 gap-4 p-8 w-full max-w-4xl">
                        {/* Mini Dashboard Cards */}
                        {[
                          { label: 'Total Properties', value: '156', icon: Building, trend: '+12%' },
                          { label: 'Active Tenants', value: '1,248', icon: Users, trend: '+8%' },
                          { label: 'Monthly Revenue', value: '$124K', icon: DollarSign, trend: '+23%' }
                        ].map((stat, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ 
                              opacity: 1, 
                              y: [0, -3, 0] 
                            }}
                            transition={{ 
                              delay: 0.5 + index * 0.1,
                              y: {
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: index * 0.5
                              }
                            }}
                            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group cursor-default"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <stat.icon className="h-5 w-5 text-blue-400" />
                              <span className="text-xs text-emerald-400 font-medium">{stat.trend}</span>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-xs text-gray-400">{stat.label}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Stats Section with Glass Cards */}
      <section className="relative py-24 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BlurFade delay={0.1} inView>
            <div className="text-center mb-16">
              <AnimatedGradientText className="mb-4">
                <TrendingUp className="mr-2 h-4 w-4" />
                Platform Metrics
              </AnimatedGradientText>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-[-0.01em]">
                Trusted by Industry Leaders
              </h2>
            </div>
          </BlurFade>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: 10000, suffix: '+', label: 'Active Users', gradient: 'from-blue-500 to-cyan-500' },
              { value: 500000, suffix: '+', label: 'Properties', gradient: 'from-purple-500 to-pink-500' },
              { value: 99.9, suffix: '%', label: 'Uptime SLA', gradient: 'from-green-500 to-emerald-500' },
              { value: 4.9, suffix: '/5', label: 'User Rating', gradient: 'from-orange-500 to-red-500' }
            ].map((stat, index) => (
              <BlurFade key={index} delay={0.2 + index * 0.1} inView>
                <motion.div 
                  className="relative group"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                  <div className="relative bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:border-white/20 hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] transition-all cursor-pointer">
                    <div className={cn(
                      "text-4xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent",
                      stat.gradient
                    )}>
                      <NumberTicker value={stat.value} />
                      {stat.suffix}
                    </div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                </motion.div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid with Glass Morphism */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BlurFade delay={0.1} inView>
            <div className="text-center mb-16">
              <AnimatedGradientText className="mb-4">
                <Zap className="mr-2 h-4 w-4" />
                Platform Features
              </AnimatedGradientText>
              
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.01em]">
                Everything You Need to
                <span className="block mt-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Scale Your Business
                </span>
              </h2>
              
              <p className="max-w-3xl mx-auto text-xl text-gray-400/90 font-[450] leading-[1.7]">
                Built for modern property management teams who demand excellence
              </p>
            </div>
          </BlurFade>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'AI-Powered Analytics',
                description: 'Predictive insights that help you make data-driven decisions and optimize performance.',
                icon: '🤖',
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                title: 'Smart Automation',
                description: 'Automate repetitive tasks and workflows to save time and reduce human error.',
                icon: '⚡',
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                title: 'Real-time Monitoring',
                description: 'Track property performance, tenant satisfaction, and maintenance in real-time.',
                icon: '📊',
                gradient: 'from-green-500 to-emerald-500'
              },
              {
                title: 'Secure Payments',
                description: 'Process rent collection and vendor payments with bank-level security.',
                icon: '💳',
                gradient: 'from-orange-500 to-red-500'
              },
              {
                title: 'Mobile First',
                description: 'Manage properties on-the-go with our powerful mobile applications.',
                icon: '📱',
                gradient: 'from-indigo-500 to-purple-500'
              },
              {
                title: 'Enterprise Security',
                description: 'SOC 2 compliant with end-to-end encryption and regular security audits.',
                icon: '🔒',
                gradient: 'from-pink-500 to-rose-500'
              }
            ].map((feature, index) => (
              <BlurFade key={index} delay={0.2 + index * 0.05} inView>
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="relative group h-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all" />
                  <div className="relative h-full bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:border-white/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all">
                    <div className={cn(
                      "inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-gradient-to-r",
                      feature.gradient
                    )}>
                      {feature.icon}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3 tracking-[-0.005em]">
                      {feature.title}
                    </h3>
                    
                    <p className="text-gray-400/90 leading-[1.6] font-[420]">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials with Glass Cards */}
      <section className="relative py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BlurFade delay={0.1} inView>
            <div className="text-center mb-16">
              <AnimatedGradientText className="mb-4">
                <Star className="mr-2 h-4 w-4" />
                Customer Stories
              </AnimatedGradientText>
              
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Loved by Property Managers
              </h2>
              
              <p className="max-w-2xl mx-auto text-xl text-gray-400">
                Join thousands who've transformed their operations with TenantFlow
              </p>
            </div>
          </BlurFade>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "TenantFlow revolutionized our operations. The AI insights alone increased our NOI by 25% in just 6 months.",
                author: "Sarah Johnson",
                role: "CEO, Urban Properties",
                rating: 5,
                avatar: "SJ"
              },
              {
                quote: "The automation features save us 30+ hours weekly. It's like having an extra team member that never sleeps.",
                author: "Michael Chen",
                role: "Director, Premier Estates",
                rating: 5,
                avatar: "MC"
              },
              {
                quote: "Best decision we made this year. The ROI was evident within the first month of implementation.",
                author: "Emily Rodriguez",
                role: "COO, Coastal Rentals",
                rating: 5,
                avatar: "ER"
              }
            ].map((testimonial, index) => (
              <BlurFade key={index} delay={0.2 + index * 0.1} inView>
                <div className="relative group h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all" />
                  <div className="relative h-full bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:border-white/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all">
                    {/* Rating */}
                    <div className="flex gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                    
                    {/* Quote */}
                    <blockquote className="text-gray-300 mb-8 leading-relaxed">
                      "{testimonial.quote}"
                    </blockquote>
                    
                    {/* Author */}
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold"
                        whileHover={{ scale: 1.1 }}
                        animate={{ 
                          boxShadow: [
                            '0 0 0 0 rgba(59, 130, 246, 0.4)',
                            '0 0 0 10px rgba(59, 130, 246, 0)',
                            '0 0 0 0 rgba(59, 130, 246, 0)'
                          ]
                        }}
                        transition={{
                          boxShadow: {
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }
                        }}
                      >
                        {testimonial.avatar}
                      </motion.div>
                      <div>
                        <div className="font-bold text-white">
                          {testimonial.author}
                        </div>
                        <div className="text-sm text-gray-400">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with Ripple Effect */}
      <section className="relative py-32 border-t border-white/10 overflow-hidden">
        <Ripple />
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <BlurFade delay={0.1} inView>
            <>
              <AnimatedGradientText className="mb-6">
                <Sparkles className="mr-2 h-4 w-4" />
                Ready to Get Started?
              </AnimatedGradientText>
              
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
                Transform Your Property
                <span className="block mt-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Management Today
                </span>
              </h2>
              
              <p className="max-w-3xl mx-auto text-xl text-gray-400 mb-12">
                Join thousands of property managers who are already saving time, 
                reducing costs, and growing with TenantFlow.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
                <RainbowButton className="px-8 py-4">
                  <span className="flex items-center gap-2 text-lg font-semibold">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </RainbowButton>
                
                <Button 
                  size="lg"
                  variant="outline"
                  className="px-8 py-4 border-white/20 text-white hover:bg-white/10"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Watch Demo
                </Button>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </>
          </BlurFade>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="relative bg-slate-950/80 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <span className="font-bold text-xl text-white">TenantFlow</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                The modern property management platform that empowers teams to scale with confidence.
              </p>
            </div>
            
            {/* Links */}
            {[
              { title: 'Product', items: ['Features', 'Pricing', 'API', 'Integrations'] },
              { title: 'Company', items: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', items: ['Privacy', 'Terms', 'Security', 'Status'] }
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold text-white mb-4">{section.title}</h4>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item}>
                      <Link 
                        href={`/${item.toLowerCase()}`}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 TenantFlow. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
