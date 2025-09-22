'use client'

import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-4 left-1/2 z-50 w-auto -translate-x-1/2 transform rounded-full px-6 py-3 backdrop-blur-xl border border-gray-200 shadow-lg bg-white/80">
        <div className="flex items-center justify-between gap-8">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-600 border border-gray-200 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-white"
              >
                <path
                  d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              TenantFlow
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <Link
              href="/pricing"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              Pricing
            </Link>
            <Link
              href="/faq"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              FAQ
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="hidden sm:flex px-4 py-2 text-gray-900 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="flex items-center px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 sm:pt-40 sm:pb-24 flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto flex-1 flex flex-col">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-blue-200 bg-blue-50">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse" />
              <span className="text-gray-700 font-medium text-sm">
                Trusted by 10,000+ property managers
              </span>
            </div>
          </div>

          {/* Hero Container - Simple Left/Right Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 max-w-7xl mx-auto flex-1 items-center">
            {/* Left Side - Content */}
            <div className="flex flex-col justify-center p-6 lg:p-0">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">
                Stop juggling
                <span className="block text-blue-600">multiple tools</span>
              </h1>

              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                TenantFlow brings all your property management needs together.
                Streamline operations, automate workflows, and scale your business.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  size="lg"
                  onClick={() => router.push('/login')}
                  className="px-8 py-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/pricing')}
                  className="px-8 py-4 text-lg font-medium border-2 border-gray-300 hover:border-blue-400 text-gray-900 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  View Pricing
                </Button>
              </div>

              <p className="text-sm text-gray-600 font-medium">
                No setup fees • Enterprise security • 99.9% uptime SLA
              </p>
            </div>

            {/* Right Side - Image */}
            <div className="relative h-[500px] lg:h-[600px] rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3"
                alt="Modern luxury apartment building showcasing TenantFlow property management"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
