'use client'

import { ArrowRight, Sparkles, Play, Check, TrendingUp, Shield, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NumberTicker } from '@/components/magicui'
import { HeroSection } from '@/components/landing/hero-section'
import { useRef } from 'react'

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })
  
  // Parallax transforms for premium scroll effects
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  
  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/30">
      {/* Simplified Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">TenantFlow</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {[
                { name: 'Features', href: '/features' },
                { name: 'Pricing', href: '/pricing' },
                { name: 'Customers', href: '/customers' },
                { name: 'Resources', href: '/resources' }
              ].map((item) => (
                <Link 
                  key={item.name}
                  href={item.href}
                  className="px-4 py-2 text-[14px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="hidden md:inline-flex text-[14px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white h-9 px-4">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-[14px] font-medium h-9 px-4 shadow-sm hover:shadow-md transition-all">
                  Start Free Trial
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Hero Section - Linear/Vercel Inspired */}
      <HeroSection />
      
      {/* Simplified Stats Banner */}
      <section className="border-y border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-900/50">
              <TrendingUp className="mr-2 h-4 w-4" />
              Growing Fast
            </Badge>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Trusted by Property Managers Worldwide
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 10000, suffix: '+', label: 'Active Users', icon: '👥' },
              { value: 500000, suffix: '+', label: 'Properties Managed', icon: '🏢' },
              { value: 99.9, suffix: '%', label: 'Uptime SLA', icon: '⚡' },
              { value: 4.9, suffix: '/5', label: 'User Rating', icon: '⭐' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500 text-white text-xl mb-4">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  <NumberTicker value={stat.value} />
                  <span className="text-blue-600">{stat.suffix}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simplified Features Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-900/50">
              <Zap className="mr-2 h-4 w-4" />
              Platform Features
            </Badge>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Everything You Need to Scale
            </h2>
            
            <p className="max-w-3xl mx-auto text-xl text-gray-600 dark:text-gray-300">
              Built for modern property management teams who demand streamlined operations, 
              intelligent automation, and data-driven insights that accelerate growth.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Tenant Management',
                description: 'AI-powered tenant screening, automated onboarding workflows, and seamless communication channels.',
                icon: '👥',
                features: ['Smart Screening', 'Digital Onboarding', 'Communication Hub']
              },
              {
                title: 'Financial Analytics',
                description: 'Real-time revenue tracking, predictive analytics, and comprehensive portfolio performance insights.',
                icon: '📊',
                features: ['Real-time Dashboards', 'Predictive Analytics', 'ROI Tracking']
              },
              {
                title: 'Maintenance Automation',
                description: 'Intelligent work order routing, preventive maintenance scheduling, and vendor management.',
                icon: '🔧',
                features: ['Auto Work Orders', 'Preventive Scheduling', 'Vendor Network']
              },
              {
                title: 'Smart Workflows',
                description: 'Custom automation rules, trigger-based actions, and workflow optimization for repetitive tasks.',
                icon: '⚡',
                features: ['Custom Rules', 'Auto Triggers', 'Task Optimization']
              },
              {
                title: 'Multi-Property Support',
                description: 'Unified dashboard for unlimited properties, cross-portfolio analytics, and scalable architecture.',
                icon: '🌍',
                features: ['Unlimited Properties', 'Unified Dashboard', 'Scalable Architecture']
              },
              {
                title: 'Compliance & Security',
                description: 'Automated compliance monitoring, document management, and enterprise-grade security protocols.',
                icon: '🛡️',
                features: ['Auto Compliance', 'Document Management', 'Enterprise Security']
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500 text-white text-2xl mb-6">
                  {feature.icon}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                  {feature.description}
                </p>
                
                <div className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simplified Social Proof */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-900/50">
              <Shield className="mr-2 h-4 w-4" />
              Trusted by Leaders
            </Badge>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Loved by Property Managers Everywhere
            </h2>
            
            <p className="max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300">
              Join thousands of forward-thinking property managers who've transformed their operations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "TenantFlow completely transformed our 500+ unit portfolio operations. The automation features alone save us 20 hours weekly—that's game-changing efficiency.",
                author: "Sarah Johnson",
                role: "Property Manager",
                company: "Urban Living Properties",
                rating: 5,
                avatar: "SJ",
                metrics: "20hrs saved/week"
              },
              {
                quote: "The financial analytics opened our eyes to insights we never had. We increased our NOI by 15% in just 6 months. The ROI is incredible.",
                author: "Michael Chen", 
                role: "CEO",
                company: "Premier Estates",
                rating: 5,
                avatar: "MC",
                metrics: "15% NOI increase"
              },
              {
                quote: "Simply the best property management software. Exceptional support, intuitive design, and features that actually solve real problems we face daily.",
                author: "Emily Rodriguez",
                role: "Operations Director", 
                company: "Coastal Rentals",
                rating: 5,
                avatar: "ER",
                metrics: "99.8% uptime"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300">
                {/* Rating Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-500 text-lg">
                      ⭐
                    </span>
                  ))}
                </div>
                
                {/* Quote */}
                <blockquote className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed text-lg">
                  "{testimonial.quote}"
                </blockquote>
                
                {/* Metrics Badge */}
                <div className="mb-6">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    {testimonial.metrics}
                  </Badge>
                </div>
                
                {/* Author Info */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500">
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simplified CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-black dark:via-blue-950 dark:to-black">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-blue-300/30 text-blue-300 bg-blue-950/50">
            <Sparkles className="mr-2 h-4 w-4" />
            Ready to Get Started?
          </Badge>
          
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
            Transform Your Property Management Today
          </h2>
          
          <p className="max-w-3xl mx-auto text-xl text-gray-300 leading-relaxed mb-12">
            Join thousands of property managers who are already saving time, reducing costs, 
            and growing their business with TenantFlow's intelligent automation platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <Button 
              size="lg"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <span className="flex items-center gap-2">
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </span>
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              className="px-8 py-4 border-white/20 text-white text-lg font-semibold hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Watch 2min Demo
              </span>
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              <span>Cancel anytime</span>
            </div>
          
          {/* Trust Indicators */}
          <div className="mt-16 pt-12 border-t border-white/10">
            <p className="text-gray-400 mb-8">Trusted by forward-thinking property managers</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
              {['Enterprise Security', '99.9% Uptime', '24/7 Support', 'SOC 2 Compliant'].map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="text-white font-medium">{feature}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Premium Footer - Vercel Style */}
      <footer className="relative bg-white dark:bg-slate-900 border-t border-gray-100/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand Section */}
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">T</span>
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-20" />
                </div>
                <span className="font-bold text-xl text-gray-900 dark:text-white">TenantFlow</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md leading-relaxed">
                The modern property management platform that empowers teams to automate operations, 
                optimize performance, and scale with confidence.
              </p>
              
              {/* Social Links */}
              <div className="flex gap-4">
                {[
                  { name: 'Twitter', icon: '𝕏', href: '#' },
                  { name: 'LinkedIn', icon: '💼', href: '#' },
                  { name: 'GitHub', icon: '⚡', href: '#' }
                ].map((social) => (
                  <a 
                    key={social.name}
                    href={social.href}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors duration-200"
                    aria-label={social.name}
                  >
                    <span className="text-lg">{social.icon}</span>
                  </a>
                ))}
              </div>
            </div>
            
            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Integrations', 'Security', 'API'].map((item) => (
                  <li key={item}>
                    <Link 
                      href={`/${item.toLowerCase()}`} 
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-3">
                {['About', 'Blog', 'Careers', 'Contact', 'Partners'].map((item) => (
                  <li key={item}>
                    <Link 
                      href={`/${item.toLowerCase()}`} 
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Legal Links */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                {['Privacy', 'Terms', 'Cookies', 'GDPR', 'Status'].map((item) => (
                  <li key={item}>
                    <Link 
                      href={`/${item.toLowerCase()}`} 
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Bottom Section */}
          <div className="border-t border-gray-100/50 dark:border-slate-800/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              © 2024 TenantFlow. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-500">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                All systems operational
              </span>
              <span>Built with 💙 for property managers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
