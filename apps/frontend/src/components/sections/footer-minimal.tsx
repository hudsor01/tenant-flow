'use client'

import * as React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Github,
  Mail,
  MapPin,
  Phone,
  ArrowRight,
  Shield,
  Award,
  Users
} from 'lucide-react'
import { 
  cn,
  TYPOGRAPHY_SCALE 
} from '@/lib/design-system'

const footerSections = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "/features" },
      { name: "Pricing", href: "/pricing" },
      { name: "Integrations", href: "/integrations" },
      { name: "API Docs", href: "/docs" }
    ]
  },
  {
    title: "Company", 
    links: [
      { name: "About", href: "/about" },
      { name: "Blog", href: "/blog" },
      { name: "Careers", href: "/careers" },
      { name: "Press", href: "/press" }
    ]
  },
  {
    title: "Resources",
    links: [
      { name: "Help Center", href: "/help" },
      { name: "Contact", href: "/contact" },
      { name: "Status", href: "/status" },
      { name: "Changelog", href: "/changelog" }
    ]
  }
]

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" }
]

const legalLinks = [
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
  { name: "Security", href: "/security" },
  { name: "GDPR", href: "/gdpr" }
]

const trustBadges = [
  { icon: Shield, text: "SOC 2 Compliant" },
  { icon: Award, text: "99.9% Uptime" },
  { icon: Users, text: "Enterprise Ready" }
]

export interface FooterMinimalProps extends React.ComponentProps<'footer'> {
  variant?: 'minimal' | 'comprehensive'
  showNewsletter?: boolean
  showTrustBadges?: boolean
  showContactInfo?: boolean
}

export const FooterMinimal = React.forwardRef<HTMLElement, FooterMinimalProps>(
  ({ 
    variant = 'comprehensive',
    showNewsletter = true,
    showTrustBadges = true, 
    showContactInfo = false,
    className, 
    ...props 
  }, ref) => {
    return (
      <footer 
        ref={ref}
        className={cn(
          'bg-card border-t border-border',
          className
        )}
        {...props}
      >
        <div className="container mx-auto max-w-7xl px-6 py-16">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg">
                  <Building2 className="h-6 w-6" />
                </div>
                <span 
                  className="ml-3 text-foreground font-bold"
                  style={TYPOGRAPHY_SCALE['heading-md']}
                >
                  TenantFlow
                </span>
              </div>

              <p 
                className="text-muted-foreground mb-6 leading-relaxed max-w-sm"
                style={TYPOGRAPHY_SCALE['body-sm']}
              >
                The modern property management platform that helps you streamline operations, increase efficiency, and scale your business.
              </p>

              {/* Social Links */}
              <div className="flex gap-3">
                {socialLinks.map((social, idx) => {
                  const Icon = social.icon
                  return (
                    <a 
                      key={idx}
                      href={social.href}
                      aria-label={social.label}
                      className="w-10 h-10 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200 hover:shadow-md"
                    >
                      <Icon size={18} />
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Navigation Sections */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {footerSections.map((section, sectionIdx) => (
                  <div key={sectionIdx}>
                    <h3 
                      className="text-foreground mb-4 font-semibold"
                      style={TYPOGRAPHY_SCALE['body-md']}
                    >
                      {section.title}
                    </h3>
                    <ul className="space-y-3">
                      {section.links.map((link, linkIdx) => (
                        <li key={linkIdx}>
                          <Link 
                            href={link.href}
                            className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Newsletter/Contact Column */}
            <div className="lg:col-span-1">
              {showNewsletter && (
                <div className="mb-8">
                  <h3 
                    className="text-foreground mb-4 font-semibold"
                    style={TYPOGRAPHY_SCALE['body-md']}
                  >
                    Stay Updated
                  </h3>
                  <p 
                    className="text-muted-foreground mb-4"
                    style={TYPOGRAPHY_SCALE['body-sm']}
                  >
                    Get the latest property management insights and updates.
                  </p>
                  <div className="flex flex-col gap-3">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                    <Button size="sm" className="justify-center">
                      Subscribe
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {showContactInfo && (
                <div>
                  <h3 
                    className="text-foreground mb-4 font-semibold"
                    style={TYPOGRAPHY_SCALE['body-md']}
                  >
                    Contact Us
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>support@tenantflow.app</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>1-800-TENANT</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>San Francisco, CA</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trust Badges */}
          {showTrustBadges && (
            <div className="border-t border-border pt-8 mb-8">
              <div className="flex flex-wrap items-center justify-center gap-8">
                {trustBadges.map((badge, idx) => {
                  const Icon = badge.icon
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="h-4 w-4 text-green-600" />
                      <span>{badge.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bottom Section */}
          <div className="border-t border-border pt-8 flex flex-col lg:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground text-center lg:text-left">
              © {new Date().getFullYear()} TenantFlow. All rights reserved.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-6">
              {legalLinks.map((link, idx) => (
                <Link 
                  key={idx}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    )
  }
)

FooterMinimal.displayName = 'FooterMinimal'