'use client'

import Link from 'next/link'
import { Building2, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const footerSections = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "/features" },
      { name: "Pricing", href: "/pricing" },
      { name: "Property Management", href: "/property-management" },
      { name: "Tenant Screening", href: "/tenant-screening" },
      { name: "Maintenance Tracking", href: "/maintenance" },
      { name: "Financial Reports", href: "/reports" }
    ]
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Careers", href: "/careers" },
      { name: "Blog", href: "/blog" },
      { name: "Case Studies", href: "/case-studies" },
      { name: "Press & Media", href: "/press" },
      { name: "Our Team", href: "/team" }
    ]
  },
  {
    title: "Resources",
    links: [
      { name: "Help Center", href: "/help" },
      { name: "Documentation", href: "/docs" },
      { name: "API Reference", href: "/api" },
      { name: "Community Forum", href: "/community" },
      { name: "Webinars", href: "/webinars" },
      { name: "Best Practices", href: "/best-practices" }
    ]
  },
  {
    title: "Support",
    links: [
      { name: "Contact Support", href: "/support" },
      { name: "System Status", href: "/status" },
      { name: "Security", href: "/security" },
      { name: "Data Migration", href: "/migration" },
      { name: "Training", href: "/training" }
    ]
  }
]

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Instagram, href: "#", label: "Instagram" }
]

const legalLinks = [
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Terms of Service", href: "/terms" },
  { name: "Cookie Policy", href: "/cookies" },
  { name: "Security Policy", href: "/security-policy" }
]

export function FooterComprehensive() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-900">TenantFlow</span>
            </div>
            
            <p className="text-gray-600 leading-relaxed mb-6 max-w-md">
              The complete property management platform trusted by thousands of landlords and property managers to streamline operations and grow their business.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                <span className="text-sm">San Francisco, CA</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Mail className="w-4 h-4 mr-3 text-gray-400" />
                <a href="mailto:support@tenantflow.com" className="text-sm hover:text-blue-600">
                  support@tenantflow.com
                </a>
              </div>
              <div className="flex items-center text-gray-600">
                <Phone className="w-4 h-4 mr-3 text-gray-400" />
                <a href="tel:+18554636469" className="text-sm hover:text-blue-600">
                  +1 (855) 463-6469
                </a>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social, idx) => (
                <a 
                  key={idx}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, idx) => (
            <div key={idx}>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link 
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-gray-200 pt-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Stay Updated</h4>
              <p className="text-sm text-gray-600">
                Get the latest property management tips, feature updates, and industry insights.
              </p>
            </div>
            <div className="flex gap-3 max-w-sm">
              <Input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1"
              />
              <Button>Subscribe</Button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} TenantFlow. All rights reserved.
          </p>
          <div className="flex gap-6">
            {legalLinks.map((link, idx) => (
              <Link 
                key={idx}
                href={link.href}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
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