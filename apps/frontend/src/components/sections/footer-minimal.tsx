'use client'

import Link from 'next/link'
import { Building2, Facebook, Twitter, Linkedin, Github } from 'lucide-react'

const footerLinks = [
  { name: "Features", href: "/features" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
  { name: "Blog", href: "/blog" },
  { name: "Help", href: "/help" },
  { name: "Contact", href: "/contact" }
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
  { name: "Security", href: "/security" }
]

export function FooterMinimal() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Main Content */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8">
          {/* Brand */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">TenantFlow</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap gap-8">
            {footerLinks.map((link, idx) => (
              <Link 
                key={idx}
                href={link.href}
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Social Links */}
          <div className="flex gap-4">
            {socialLinks.map((social, idx) => (
              <a 
                key={idx}
                href={social.href}
                aria-label={social.label}
                className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <social.icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
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