import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Users, 
  Star, 
  Quote, 
  ArrowRight, 
  MapPin,
  TrendingUp,
  Award,
  CheckCircle
} from 'lucide-react'

const customerTestimonials = [
  {
    name: "Sarah Johnson",
    title: "Property Manager",
    company: "Johnson Properties",
    location: "Austin, TX",
    properties: 45,
    image: "/api/placeholder/60/60",
    rating: 5,
    quote: "TenantFlow has transformed how we manage our portfolio. What used to take hours now takes minutes. Our tenants are happier and our cash flow has improved by 30%.",
    results: "30% improved cash flow",
    featured: true
  },
  {
    name: "Michael Chen",
    title: "Real Estate Investor",
    company: "Chen Capital",
    location: "San Francisco, CA",
    properties: 12,
    image: "/api/placeholder/60/60", 
    rating: 5,
    quote: "The automation features are incredible. Maintenance requests, lease renewals, rent collection - everything runs smoothly without constant oversight.",
    results: "50% time savings"
  },
  {
    name: "Lisa Rodriguez",
    title: "Portfolio Manager",
    company: "Sunshine Rentals",
    location: "Miami, FL",
    properties: 78,
    image: "/api/placeholder/60/60",
    rating: 5,
    quote: "Customer support is outstanding. Any question gets answered within minutes. The platform is intuitive and our team adopted it immediately.",
    results: "Zero learning curve"
  },
  {
    name: "David Kim",
    title: "Property Owner",
    company: "Individual Investor",
    location: "Seattle, WA", 
    properties: 8,
    image: "/api/placeholder/60/60",
    rating: 5,
    quote: "I was skeptical about property management software, but TenantFlow made everything so much easier. My tenants love the tenant portal.",
    results: "100% tenant satisfaction"
  },
  {
    name: "Jennifer Walsh",
    title: "Operations Director",
    company: "Metro Property Group",
    location: "Chicago, IL",
    properties: 156,
    image: "/api/placeholder/60/60",
    rating: 5,
    quote: "Scaling our operations would have been impossible without TenantFlow. We've doubled our portfolio size while keeping the same team size.",
    results: "2x portfolio growth"
  },
  {
    name: "Robert Taylor",
    title: "Facilities Manager",
    company: "Taylor Residential",
    location: "Denver, CO",
    properties: 23,
    image: "/api/placeholder/60/60",
    rating: 5,
    quote: "The maintenance tracking system has been a game-changer. We can track every request and our response times have improved dramatically.",
    results: "70% faster response times"
  }
]

const stats = [
  { number: "10,000+", label: "Properties Managed", icon: Building2 },
  { number: "500+", label: "Happy Customers", icon: Users },
  { number: "98%", label: "Customer Satisfaction", icon: Star },
  { number: "$50M+", label: "Rent Processed", icon: TrendingUp }
]

export default function CustomersPage() {
  const featuredTestimonial = customerTestimonials.find(t => t.featured)
  const regularTestimonials = customerTestimonials.filter(t => !t.featured)

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
          <Badge className="from-primary mb-6 bg-gradient-to-r to-purple-600 text-white">
            <Award className="mr-2 h-4 w-4" />
            Customer Success Stories
          </Badge>
          <h1 className="mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-5xl font-bold text-transparent">
            Trusted by Property Managers Worldwide
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            Discover how property managers and investors are transforming their operations with TenantFlow. 
            Real stories from real customers achieving real results.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-16">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="border-0 bg-gradient-to-br from-white to-gray-50 p-6 text-center shadow-lg">
                  <Icon className="text-primary mx-auto mb-4 h-8 w-8" />
                  <div className="text-3xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Testimonial */}
      {featuredTestimonial && (
        <section className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-20">
          <div className="container mx-auto">
            <div className="mx-auto max-w-4xl text-center">
              <Quote className="text-primary mx-auto mb-6 h-12 w-12" />
              <blockquote className="mb-8 text-2xl font-medium leading-relaxed text-gray-900">
                "{featuredTestimonial.quote}"
              </blockquote>
              
              <div className="mb-6 flex items-center justify-center space-x-1">
                {[...Array(featuredTestimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current text-yellow-500" />
                ))}
              </div>

              <div className="flex flex-col items-center justify-center space-y-4 md:flex-row md:space-x-8 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-400">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{featuredTestimonial.name}</div>
                    <div className="text-sm text-gray-600">{featuredTestimonial.title}</div>
                    <div className="text-sm text-gray-600">{featuredTestimonial.company}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="mr-1 h-4 w-4" />
                    {featuredTestimonial.location}
                  </div>
                  <div className="flex items-center">
                    <Building2 className="mr-1 h-4 w-4" />
                    {featuredTestimonial.properties} Properties
                  </div>
                </div>
              </div>

              <Badge className="from-primary mt-6 bg-gradient-to-r to-purple-600 text-white">
                <TrendingUp className="mr-2 h-4 w-4" />
                {featuredTestimonial.results}
              </Badge>
            </div>
          </div>
        </section>
      )}

      {/* Customer Stories Grid */}
      <section className="px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              More Success Stories
            </h2>
            <p className="text-xl text-gray-600">
              Join hundreds of property managers who have transformed their business with TenantFlow
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {regularTestimonials.map((testimonial, index) => (
              <Card key={index} className="group overflow-hidden transition-shadow duration-300 hover:shadow-xl">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current text-yellow-500" />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {testimonial.results}
                    </Badge>
                  </div>

                  <blockquote className="mb-6 text-gray-700 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>

                  <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300">
                      <Users className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.title}</div>
                      <div className="text-sm text-gray-600">{testimonial.company}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      {testimonial.location}
                    </div>
                    <div className="flex items-center">
                      <Building2 className="mr-1 h-3 w-3" />
                      {testimonial.properties} Properties
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="from-primary bg-gradient-to-r to-purple-600 px-4 py-20 text-white">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-4xl font-bold">
            Ready to Join Our Success Stories?
          </h2>
          <p className="mb-8 text-xl text-blue-100">
            Start your free trial today and see why property managers choose TenantFlow
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" className="text-primary bg-white hover:bg-gray-100">
              <Link href="/auth/signup" className="flex items-center">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link href="/demo">
                Schedule Demo
              </Link>
            </Button>
          </div>
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