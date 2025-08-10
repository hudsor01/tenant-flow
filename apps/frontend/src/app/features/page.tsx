import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  Wrench, 
  BarChart3,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Shield,
  Zap,
  Clock,
  Smartphone
} from 'lucide-react'

const features = [
  {
    icon: Building2,
    title: 'Property Management',
    description: 'Comprehensive property portfolio management with occupancy tracking',
    details: [
      'Multi-property dashboard',
      'Unit availability tracking',
      'Property maintenance scheduling',
      'Digital property records'
    ],
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Users,
    title: 'Tenant Portal',
    description: 'Self-service portal for tenants to manage their rental experience',
    details: [
      'Online rent payments',
      'Maintenance request submission',
      'Lease document access',
      'Communication center'
    ],
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: CreditCard,
    title: 'Online Payments',
    description: 'Secure payment processing with automated reminders',
    details: [
      'Multiple payment methods',
      'Automatic rent collection',
      'Late fee automation',
      'Payment history tracking'
    ],
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: FileText,
    title: 'Digital Leases',
    description: 'Create, sign, and manage lease agreements electronically',
    details: [
      'Digital signature integration',
      'Customizable lease templates',
      'Automated lease renewals',
      'Document storage & retrieval'
    ],
    gradient: 'from-orange-500 to-red-500'
  },
  {
    icon: Wrench,
    title: 'Maintenance Tracking',
    description: 'Streamlined maintenance request and work order management',
    details: [
      'Work order automation',
      'Vendor management',
      'Cost tracking',
      'Maintenance history'
    ],
    gradient: 'from-pink-500 to-rose-500'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Comprehensive financial and operational reporting',
    details: [
      'Revenue analytics',
      'Occupancy reports',
      'Maintenance cost analysis',
      'Custom report builder'
    ],
    gradient: 'from-indigo-500 to-purple-500'
  }
]

const additionalFeatures = [
  {
    icon: Smartphone,
    title: 'Mobile App',
    description: 'Manage properties on-the-go with our mobile application'
  },
  {
    icon: Shield,
    title: 'Security & Compliance',
    description: 'Bank-level security with compliance reporting'
  },
  {
    icon: Zap,
    title: 'API Integration',
    description: 'Connect with your favorite tools via our robust API'
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'Round-the-clock customer support and assistance'
  }
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <Building2 className="h-8 w-8 text-blue-600 transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TenantFlow
            </span>
          </Link>
          <Button asChild>
            <Link href="/auth/signup">Get Started Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto text-center">
          <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Complete Feature Set
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Everything You Need to Manage Properties
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From tenant management to financial reporting, TenantFlow provides all the tools 
            you need to streamline your property management operations.
          </p>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                  <CardContent className="p-8">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {feature.description}
                    </p>
                    <ul className="space-y-2">
                      {feature.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Plus Many More Features
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              TenantFlow includes everything you need to run your property management business efficiently
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                  <Icon className="h-8 w-8 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of property managers using TenantFlow
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Link href="/auth/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <Link href="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 TenantFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}