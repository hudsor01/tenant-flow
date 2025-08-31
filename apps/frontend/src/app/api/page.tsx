import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Code, 
  Book, 
  Zap, 
  Shield, 
  Clock,
  ArrowRight,
  Copy,
  ExternalLink,
  CheckCircle,
  Settings,
  Database
} from 'lucide-react'

const apiEndpoints = [
  {
    method: "GET",
    endpoint: "/api/v1/properties",
    description: "Retrieve all properties for authenticated user",
    auth: "Bearer Token"
  },
  {
    method: "POST", 
    endpoint: "/api/v1/properties",
    description: "Create a new property",
    auth: "Bearer Token"
  },
  {
    method: "GET",
    endpoint: "/api/v1/tenants",
    description: "Get tenant information",
    auth: "Bearer Token"
  },
  {
    method: "POST",
    endpoint: "/api/v1/maintenance",
    description: "Create maintenance request",
    auth: "Bearer Token"
  }
]

const features = [
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security with 99.9% uptime SLA"
  },
  {
    icon: Zap,
    title: "Fast & Scalable", 
    description: "Sub-100ms response times with automatic scaling"
  },
  {
    icon: Book,
    title: "Well Documented",
    description: "Comprehensive documentation with examples"
  },
  {
    icon: Code,
    title: "RESTful Design",
    description: "Clean, intuitive API following REST principles"
  }
]

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET':
      return 'bg-green-100 text-green-800'
    case 'POST':
      return 'bg-blue-100 text-blue-800'
    case 'PUT':
      return 'bg-orange-100 text-orange-800'
    case 'DELETE':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function ApiPage() {
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
            <Code className="mr-2 h-4 w-4" />
            API Documentation
          </Badge>
          <h1 className="mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-5xl font-bold text-transparent">
            TenantFlow API
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            Integrate TenantFlow's property management capabilities into your applications with our 
            comprehensive REST API. Build custom solutions and automate your workflows.
          </p>
          
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg">
              <Link href="/auth/signup" className="flex items-center">
                Get API Access
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              <Link href="/contact" className="flex items-center">
                View Documentation
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* API Features */}
      <section className="px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">Why Choose Our API?</h2>
            <p className="text-xl text-gray-600">
              Built for developers, designed for scale
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="border-0 bg-gradient-to-br from-white to-gray-50 text-center shadow-lg">
                  <CardContent className="p-8">
                    <div className="text-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-gray-900">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">Quick Start</h2>
            <p className="text-xl text-gray-600">
              Get up and running with the TenantFlow API in minutes
            </p>
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    1. Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-600">
                    All API requests require authentication using Bearer tokens.
                  </p>
                  <div className="rounded-lg bg-gray-900 p-4">
                    <code className="text-sm text-green-400">
                      curl -H "Authorization: Bearer YOUR_TOKEN"
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* Base URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    2. Base URL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-600">
                    All API endpoints are relative to the base URL.
                  </p>
                  <div className="rounded-lg bg-gray-900 p-4">
                    <code className="text-sm text-blue-400">
                      https://api.tenantflow.app/v1
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* Rate Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    3. Rate Limits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-600">
                    API calls are limited to 1000 requests per hour per API key.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Standard Plan:</span>
                      <span className="font-mono">1,000/hour</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pro Plan:</span>
                      <span className="font-mono">10,000/hour</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Response Format */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="mr-2 h-5 w-5" />
                    4. Response Format
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-600">
                    All responses are returned in JSON format.
                  </p>
                  <div className="rounded-lg bg-gray-900 p-4">
                    <code className="text-sm text-yellow-400">
                      {"{ \"success\": true, \"data\": {...} }"}
                    </code>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">Popular Endpoints</h2>
            <p className="text-xl text-gray-600">
              Common API endpoints to get you started
            </p>
          </div>

          <div className="mx-auto max-w-4xl space-y-4">
            {apiEndpoints.map((endpoint, index) => (
              <Card key={index} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center space-x-3">
                        <Badge className={getMethodColor(endpoint.method)}>
                          {endpoint.method}
                        </Badge>
                        <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono">
                          {endpoint.endpoint}
                        </code>
                      </div>
                      <p className="mb-2 text-gray-600">{endpoint.description}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Shield className="mr-1 h-4 w-4" />
                        {endpoint.auth}
                      </div>
                    </div>
                    <div className="lg:ml-4">
                      <Button variant="outline" size="sm">
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button size="lg">
              <Link href="/contact" className="flex items-center">
                View Full Documentation
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* SDK & Tools */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">SDKs & Tools</h2>
            <p className="text-xl text-gray-600">
              Official SDKs and tools to accelerate your development
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { name: "JavaScript SDK", description: "For Node.js and browser applications", status: "Available" },
              { name: "Python SDK", description: "For Python applications and data analysis", status: "Available" },
              { name: "Postman Collection", description: "Ready-to-use API collection for testing", status: "Available" }
            ].map((tool, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <Code className="text-primary h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">{tool.name}</h3>
                  <p className="mb-4 text-sm text-gray-600">{tool.description}</p>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {tool.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="from-primary bg-gradient-to-r to-purple-600 px-4 py-20 text-white">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-4xl font-bold">Need Help Getting Started?</h2>
          <p className="mb-8 text-xl text-blue-100">
            Our developer support team is here to help you integrate successfully
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" className="text-primary bg-white hover:bg-gray-100">
              <Link href="/contact" className="flex items-center">
                Contact Support
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link href="/resources">
                Browse Resources
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