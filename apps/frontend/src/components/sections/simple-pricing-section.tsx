'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function SimplePricingSection() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Simple Pricing</h2>
          <p className="text-xl text-gray-600">Choose the perfect plan for your business</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <div className="bg-white border rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">Starter</h3>
            <div className="text-3xl font-bold mb-6">$29<span className="text-lg font-normal">/month</span></div>
            <ul className="mb-8 space-y-3">
              <li>✓ Up to 10 properties</li>
              <li>✓ Basic tenant screening</li>
              <li>✓ Rent collection</li>
              <li>✓ Email support</li>
            </ul>
            <Button asChild className="w-full">
              <Link href="/auth/sign-up?plan=starter">Start Free Trial</Link>
            </Button>
          </div>

          {/* Professional Plan */}
          <div className="bg-white border-2 border-blue-500 rounded-lg p-8 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm">Most Popular</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">Professional</h3>
            <div className="text-3xl font-bold mb-6">$99<span className="text-lg font-normal">/month</span></div>
            <ul className="mb-8 space-y-3">
              <li>✓ Up to 100 properties</li>
              <li>✓ Advanced tenant screening</li>
              <li>✓ Automated rent collection</li>
              <li>✓ Maintenance management</li>
              <li>✓ Financial reporting</li>
              <li>✓ Priority support</li>
            </ul>
            <Button asChild className="w-full">
              <Link href="/auth/sign-up?plan=professional">Start Free Trial</Link>
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white border rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">Enterprise</h3>
            <div className="text-3xl font-bold mb-6">$299<span className="text-lg font-normal">/month</span></div>
            <ul className="mb-8 space-y-3">
              <li>✓ Unlimited properties</li>
              <li>✓ Custom integrations</li>
              <li>✓ Dedicated support</li>
              <li>✓ Advanced analytics</li>
            </ul>
            <Button asChild variant="outline" className="w-full">
              <Link href="/contact?plan=enterprise">Contact Sales</Link>
            </Button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6">Ready to get started?</p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Start Your Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing/checkout">Test Stripe Checkout</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}