'use client'

import Link from 'next/link'
import { Building2, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const productLinks = [
  { name: "Property Management", href: "/property-management" },
  { name: "Tenant Screening", href: "/tenant-screening" },
  { name: "Rent Collection", href: "/rent-collection" },
  { name: "Maintenance Tracking", href: "/maintenance" },
  { name: "Financial Reports", href: "/reports" }
]

const companyLinks = [
  { name: "About Us", href: "/about" },
  { name: "Careers", href: "/careers" },
  { name: "Blog", href: "/blog" },
  { name: "Case Studies", href: "/case-studies" },
  { name: "Press Kit", href: "/press" }
]

const supportLinks = [
  { name: "Help Center", href: "/help" },
  { name: "Contact Support", href: "/support" },
  { name: "API Documentation", href: "/docs" },
  { name: "System Status", href: "/status" },
  { name: "Community", href: "/community" }
]

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Instagram, href: "#", label: "Instagram" }
]

export function FooterGradient() {
  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
      
      <div className="relative mx-auto max-w-7xl px-6 py-20">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-2xl font-bold">TenantFlow</span>
            </div>
            
            <p className="text-gray-300 leading-relaxed mb-8 max-w-md">
              Empowering property managers with cutting-edge technology to streamline operations, maximize efficiency, and deliver exceptional tenant experiences.
            </p>

            {/* Newsletter Signup */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-4">Stay in the Loop</h4>
              <div className="flex gap-3 max-w-sm">
                <Input 
                  type="email" 
                  placeholder="your@email.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
                <Button variant="secondary" size="sm">
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Weekly insights and product updates</p>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                <span className="text-sm">San Francisco, CA</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Mail className="w-4 h-4 mr-3 text-gray-400" />
                <a href="mailto:hello@tenantflow.com" className="text-sm hover:text-white transition-colors">
                  hello@tenantflow.com
                </a>
              </div>
              <div className="flex items-center text-gray-300">
                <Phone className="w-4 h-4 mr-3 text-gray-400" />
                <a href="tel:+18554636469" className="text-sm hover:text-white transition-colors">
                  +1 (855) 463-6469
                </a>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Product</h4>
            <ul className="space-y-4">
              {productLinks.map((link, idx) => (
                <li key={idx}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors flex items-center group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Company</h4>
            <ul className="space-y-4">
              {companyLinks.map((link, idx) => (
                <li key={idx}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors flex items-center group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Support</h4>
            <ul className="space-y-4">
              {supportLinks.map((link, idx) => (
                <li key={idx}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors flex items-center group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social Links */}
        <div className="mb-16">
          <h4 className="text-lg font-semibold mb-6">Connect With Us</h4>
          <div className="flex gap-4">
            {socialLinks.map((social, idx) => (
              <a 
                key={idx}
                href={social.href}
                aria-label={social.label}
                className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-gray-300 hover:bg-gradient-to-br hover:from-blue-400 hover:to-purple-400 hover:text-white hover:border-transparent transition-all duration-300 shadow-lg"
              >
                <social.icon size={20} />
              </a>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} TenantFlow. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/cookies" className="text-sm text-gray-400 hover:text-white transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}