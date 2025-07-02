import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users, 
  CheckCircle,
  ArrowRight,
  Star,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';

export default function LandingPageClean() {
  return (
    <>
      <SEO 
        title="TenantFlow - Property Management Software"
        description="Streamline your property management with TenantFlow. Manage properties, tenants, and leases efficiently."
        keywords="property management, landlord software, tenant management, lease management"
        canonical="https://tenantflow.app"
      />
      
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">TenantFlow</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link to="/blog" className="text-gray-600 hover:text-gray-900">
                Blog
              </Link>
              <Link to="/auth/login" className="text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Button asChild>
                <Link to="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6">
            Trusted by 15,000+ property managers
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">
            Property Management
            <br />
            <span className="text-blue-600">Made Simple</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamline your rental business with our all-in-one platform. 
            Manage properties, tenants, and finances in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" asChild>
              <Link to="/auth/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">15,000+</div>
              <div className="text-gray-600">Properties Managed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">31%</div>
              <div className="text-gray-600">Average ROI Increase</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">12+</div>
              <div className="text-gray-600">Hours Saved Weekly</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">99.2%</div>
              <div className="text-gray-600">Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Everything you need to manage properties
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From tenant screening to rent collection, we've got you covered
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Property Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Centralize all your properties, units, and tenant information in one easy-to-use dashboard.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Tenant Portal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Give tenants a modern portal for payments, maintenance requests, and communication.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Financial Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Track income, expenses, and profitability with real-time analytics and reporting.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
              ))}
            </div>
            
            <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 mb-8">
              "TenantFlow has transformed how I manage my properties. I've increased my rental income by 28% 
              while cutting my workload in half."
            </blockquote>
            
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="font-semibold text-gray-900">Sarah Johnson</div>
                <div className="text-gray-600">Property Owner, 12 units</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to simplify your property management?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of property managers who trust TenantFlow to grow their business.
          </p>
          
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth/signup">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Building className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold text-white">TenantFlow</span>
            </div>
            
            <div className="flex space-x-6 text-gray-400">
              <Link to="/privacy" className="hover:text-white">Privacy</Link>
              <Link to="/terms" className="hover:text-white">Terms</Link>
              <Link to="/contact" className="hover:text-white">Contact</Link>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 TenantFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}