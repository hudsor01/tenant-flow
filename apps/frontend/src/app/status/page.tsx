import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Activity,
  Server,
  Database,
  Shield,
  Globe,
  Zap
} from 'lucide-react'

const systemComponents = [
  {
    name: "Web Application",
    status: "operational",
    description: "Frontend application and user interface",
    uptime: "99.99%",
    icon: Globe
  },
  {
    name: "API Services",
    status: "operational", 
    description: "Backend API and core services",
    uptime: "99.98%",
    icon: Server
  },
  {
    name: "Database",
    status: "operational",
    description: "PostgreSQL database cluster",
    uptime: "99.97%",
    icon: Database
  },
  {
    name: "Authentication",
    status: "operational",
    description: "User authentication and authorization",
    uptime: "99.99%",
    icon: Shield
  },
  {
    name: "File Storage",
    status: "operational",
    description: "Document and image storage",
    uptime: "99.96%",
    icon: Activity
  },
  {
    name: "Email Service",
    status: "operational",
    description: "Transactional email delivery",
    uptime: "99.95%",
    icon: Zap
  }
]

const recentIncidents = [
  {
    id: 1,
    title: "Scheduled Maintenance - Database Optimization",
    status: "resolved",
    date: "Dec 28, 2024",
    time: "2:00 AM - 2:30 AM EST",
    description: "Planned database optimization and index rebuilding. No service interruption expected.",
    impact: "No impact"
  },
  {
    id: 2,
    title: "Brief API Slowdown", 
    status: "resolved",
    date: "Dec 15, 2024",
    time: "3:45 PM - 4:10 PM EST",
    description: "Temporary increase in API response times due to high traffic volume.",
    impact: "Minor delays"
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'operational':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'degraded':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'outage':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'operational':
      return <CheckCircle className="h-4 w-4" />
    case 'degraded':
      return <AlertTriangle className="h-4 w-4" />
    case 'outage':
      return <AlertTriangle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export default function StatusPage() {
  const allOperational = systemComponents.every(component => component.status === 'operational')

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
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-6 flex items-center justify-center">
            {allOperational ? (
              <CheckCircle className="text-green-500 h-16 w-16" />
            ) : (
              <AlertTriangle className="text-yellow-500 h-16 w-16" />
            )}
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            System Status
          </h1>
          <p className="text-xl text-gray-600">
            Real-time status and uptime information for TenantFlow services
          </p>
          
          <div className="mt-8">
            <Badge className={`px-6 py-2 text-lg ${getStatusColor(allOperational ? 'operational' : 'degraded')}`}>
              {getStatusIcon(allOperational ? 'operational' : 'degraded')}
              <span className="ml-2">
                {allOperational ? 'All Systems Operational' : 'Some Systems Degraded'}
              </span>
            </Badge>
          </div>
        </div>
      </section>

      {/* Overall Status */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <Card className="mb-8 border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle className="mr-2 h-6 w-6" />
                System Status: Operational
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700">
                All systems are running smoothly. Our team monitors system performance 24/7 to ensure 
                the best possible experience for our users.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">System Components</h2>
            <p className="text-gray-600">
              Current status of all TenantFlow services and infrastructure
            </p>
            
            {systemComponents.map((component, index) => {
              const Icon = component.icon
              return (
                <Card key={index} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                          <Icon className="text-gray-600 h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{component.name}</h3>
                          <p className="text-sm text-gray-600">{component.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-right">
                        <div>
                          <div className="text-sm text-gray-500">30-day uptime</div>
                          <div className="font-semibold text-gray-900">{component.uptime}</div>
                        </div>
                        <Badge className={getStatusColor(component.status)}>
                          {getStatusIcon(component.status)}
                          <span className="ml-1 capitalize">{component.status}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Recent Incidents */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Recent Incidents</h2>
            <p className="text-gray-600">
              Recent maintenance activities and resolved issues
            </p>
          </div>

          <div className="space-y-4">
            {recentIncidents.map((incident) => (
              <Card key={incident.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">{incident.title}</h3>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {incident.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-gray-600">{incident.description}</p>
                      <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{incident.date} • {incident.time}</span>
                        <span>Impact: {incident.impact}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {recentIncidents.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="text-green-500 mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">No Recent Incidents</h3>
                <p className="text-gray-600">
                  All systems have been running smoothly with no reported incidents in the past 30 days.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Performance Metrics */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Performance Metrics</h2>
            <p className="text-gray-600">
              Key performance indicators for our services over the last 30 days
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600">99.98%</div>
                <div className="text-sm text-gray-600">Overall Uptime</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">145ms</div>
                <div className="text-sm text-gray-600">Average Response Time</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-600">0</div>
                <div className="text-sm text-gray-600">Critical Issues</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Subscribe to Updates */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Stay Informed
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            Get notified about system updates and maintenance windows
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/contact">
                Subscribe to Updates
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">
                Contact Support
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-4 py-8 text-gray-400">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <p>&copy; 2024 TenantFlow. All rights reserved.</p>
            <div className="flex space-x-4 text-sm">
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link href="/contact" className="hover:text-white">Support</Link>
              <Link href="/" className="hover:text-white">Back to TenantFlow</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}