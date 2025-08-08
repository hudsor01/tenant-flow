/**
 * Optimized Footer Section - Server Component
 * Static footer with navigation links and company information
 */

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Building2 } from 'lucide-react'

interface OptimizedFooterSectionProps {
  locale: string
}

export function OptimizedFooterSection({ locale }: OptimizedFooterSectionProps) {
  return (
    <footer className="py-12 px-4 bg-gray-900 text-gray-400">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Building2 className="h-6 w-6 text-blue-500" />
              <span className="text-white font-bold">TenantFlow</span>
            </div>
            <p className="text-sm mb-4">
              The modern property management platform that saves you time and makes you money.
            </p>
            <div className="flex items-center gap-4">
              <Badge className="bg-green-900 text-green-300">SOC 2 Certified</Badge>
              <Badge className="bg-blue-900 text-blue-300">GDPR Compliant</Badge>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/${locale}/features`} className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/pricing`} className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/demo`} className="hover:text-white transition-colors">
                  Demo
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/api`} className="hover:text-white transition-colors">
                  API
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/${locale}/about`} className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/blog`} className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/careers`} className="hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/${locale}/help`} className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/status`} className="hover:text-white transition-colors">
                  System Status
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-sm">
            © 2024 TenantFlow. All rights reserved. • Trusted by 10,000+ property managers
          </p>
        </div>
      </div>
    </footer>
  )
}