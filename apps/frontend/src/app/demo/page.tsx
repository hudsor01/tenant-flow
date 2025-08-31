import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, ArrowRight, Building2 } from 'lucide-react'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="group flex items-center space-x-2">
            <Building2 className="text-primary h-8 w-8 transition-transform group-hover:scale-110" />
            <span className="from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-xl font-bold text-transparent">
              TenantFlow
            </span>
          </Link>
          <Button asChild>
            <Link href="/auth/signup">Get Started Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-24">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            See TenantFlow in Action
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
            Experience how TenantFlow simplifies property management with our interactive demo.
            No signup required.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="inline-flex items-center" asChild>
              <Link href="/auth/signup?source=demo">
                <Play className="mr-2 h-5 w-5" />
                Start Free Trial
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact?demo=true">
                Schedule Live Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Demo Content */}
      <section className="px-4 py-20">
        <div className="container mx-auto">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6 text-center">
              <h3 className="mb-4 text-xl font-semibold">Property Dashboard</h3>
              <p className="mb-4 text-gray-600">
                See how easy it is to manage multiple properties from one central dashboard.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard">View Dashboard</Link>
              </Button>
            </Card>
            
            <Card className="p-6 text-center">
              <h3 className="mb-4 text-xl font-semibold">Tenant Management</h3>
              <p className="mb-4 text-gray-600">
                Explore our tenant portal and management tools.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/signup">Try Now</Link>
              </Button>
            </Card>

            <Card className="p-6 text-center">
              <h3 className="mb-4 text-xl font-semibold">Maintenance Tracking</h3>
              <p className="mb-4 text-gray-600">
                See how maintenance requests are handled efficiently.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="from-primary bg-gradient-to-r to-purple-600 px-4 py-20 text-white">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-4xl font-bold">Ready to Get Started?</h2>
          <p className="mb-8 text-xl text-blue-100">
            Join thousands of property managers using TenantFlow
          </p>
          <Button size="lg" className="text-primary bg-white hover:bg-gray-100" asChild>
            <Link href="/auth/signup?source=demo-cta">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-4 py-8 text-gray-400">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 TenantFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}