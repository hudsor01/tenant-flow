/**
 * Premium Footer Section with Magic UI
 * Modern footer with gradient effects and beautiful animations
 */

"use client";

import { BlurFade, AnimatedGradientText, ShimmerButton, Ripple } from '@/components/magicui'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Mail, 
  Phone, 
  MapPin,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { SocialIcon } from 'react-social-icons'

const footerLinks = {
  product: [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Integrations', href: '/integrations' },
    { name: 'API', href: '/api' },
    { name: 'Changelog', href: '/changelog' },
    { name: 'Roadmap', href: '/roadmap' }
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press', href: '/press' },
    { name: 'Partners', href: '/partners' },
    { name: 'Contact', href: '/contact' }
  ],
  resources: [
    { name: 'Documentation', href: '/docs' },
    { name: 'Help Center', href: '/help' },
    { name: 'Community', href: '/community' },
    { name: 'Templates', href: '/templates' },
    { name: 'Guides', href: '/guides' },
    { name: 'Webinars', href: '/webinars' }
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Security', href: '/security' },
    { name: 'GDPR', href: '/gdpr' },
    { name: 'Compliance', href: '/compliance' },
    { name: 'Cookie Policy', href: '/cookies' }
  ]
}

const socialLinks = [
  { name: 'Twitter', href: 'https://twitter.com/tenantflow' },
  { name: 'GitHub', href: 'https://github.com/tenantflow' },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/tenantflow' }
]

export function PremiumFooterSection() {
  return (
    <footer className="relative overflow-hidden border-t border-border/50 bg-gradient-to-b from-background to-background/95">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <Ripple />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
      
      <div className="container relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
        {/* Newsletter Section */}
        <BlurFade delay={0}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-8 lg:p-12"
          >
            <div className="mx-auto max-w-2xl text-center">
              <motion.div
                whileInView={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="mb-6 inline-flex"
              >
                <Sparkles className="w-12 h-12 text-primary" />
              </motion.div>
              
              <h3 className="text-2xl font-bold mb-4 lg:text-3xl">
                Stay Updated with TenantFlow
              </h3>
              <p className="text-muted-foreground mb-8">
                Get the latest product updates, property management tips, and industry insights delivered to your inbox.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm px-6 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <ShimmerButton>
                  Subscribe
                  <ArrowRight className="ml-2 w-4 h-4" />
                </ShimmerButton>
              </div>
              
              <p className="mt-4 text-xs text-muted-foreground">
                No spam, unsubscribe at any time. Read our{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </motion.div>
        </BlurFade>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Logo & Description */}
          <BlurFade delay={0.1}>
            <div className="lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="mb-6">
                  <AnimatedGradientText className="text-2xl font-bold">
                    TenantFlow
                  </AnimatedGradientText>
                </div>
                <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                  The modern property management platform that helps landlords and property managers 
                  streamline operations, maximize revenue, and provide exceptional tenant experiences.
                </p>
                
                {/* Contact Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>hello@tenantflow.com</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>San Francisco, CA</span>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex gap-4">
                  {socialLinks.map((social, _index) => (
                    <motion.div
                      key={social.name}
                      whileHover={{ y: -2, scale: 1.1 }}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 backdrop-blur-sm transition-all duration-300 hover:bg-primary"
                    >
                      <SocialIcon
                        url={social.href}
                        target="_blank"
                        style={{ height: 24, width: 24 }}
                        bgColor="transparent"
                        fgColor="currentColor"
                        className="text-muted-foreground hover:text-primary-foreground"
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </BlurFade>

          {/* Links Grid */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
                <BlurFade key={category} delay={0.1 * (categoryIndex + 2)}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 * categoryIndex }}
                  >
                    <h4 className="text-sm font-semibold mb-4 capitalize">
                      {category}
                    </h4>
                    <ul className="space-y-3">
                      {links.map((link) => (
                        <li key={link.name}>
                          <Link
                            href={link.href}
                            className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </BlurFade>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <BlurFade delay={0.6}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 md:flex-row"
          >
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>© 2024 TenantFlow. All rights reserved.</span>
              <div className="flex items-center gap-1">
                <span>Made with</span>
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                  className="text-red-500"
                >
                  ❤️
                </motion.span>
                <span>in San Francisco</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-green-600 dark:text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>All systems operational</span>
              </div>
              <Link 
                href="/status" 
                className="text-muted-foreground hover:text-foreground"
              >
                Status
              </Link>
            </div>
          </motion.div>
        </BlurFade>
      </div>
    </footer>
  )
}
