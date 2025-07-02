import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users, 
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  BarChart3,
  FileText,
  Calculator,
  Award,
  Phone,
  Mail,
  Menu,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';

export default function LandingPageProfessional() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <SEO 
        title="TenantFlow - Professional Property Management Software"
        description="Streamline your property management operations with TenantFlow. Trusted by experienced property managers nationwide."
        keywords="property management software, landlord tools, tenant management, lease administration, real estate management"
        canonical="https://tenantflow.app"
      />
      
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">TenantFlow</span>
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/features" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Pricing
              </Link>
              <Link to="/resources" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Resources
              </Link>
              <Link to="/support" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Support
              </Link>
              <div className="w-px h-6 bg-gray-300"></div>
              <Link to="/auth/login" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Sign In
              </Link>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-semibold">
                <Link to="/auth/signup">Get Started</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-gray-700"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
              <div className="space-y-4">
                <Link to="/features" className="block text-gray-700 hover:text-blue-600 font-medium">
                  Features
                </Link>
                <Link to="/pricing" className="block text-gray-700 hover:text-blue-600 font-medium">
                  Pricing
                </Link>
                <Link to="/resources" className="block text-gray-700 hover:text-blue-600 font-medium">
                  Resources
                </Link>
                <Link to="/support" className="block text-gray-700 hover:text-blue-600 font-medium">
                  Support
                </Link>
                <hr className="border-gray-200" />
                <Link to="/auth/login" className="block text-gray-700 hover:text-blue-600 font-medium">
                  Sign In
                </Link>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to="/auth/signup">Get Started</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust Badge */}
            <Badge variant="secondary" className="mb-8 bg-blue-100 text-blue-800 border-blue-200 px-4 py-2 text-sm font-semibold">
              <Award className="w-4 h-4 mr-2" />
              Trusted by 15,000+ Property Managers
            </Badge>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Professional Property Management
              <span className="text-blue-600 block">Made Simple</span>
            </h1>
            
            {/* Value Proposition */}
            <p className="text-xl text-gray-700 mb-8 leading-relaxed max-w-3xl mx-auto">
              Streamline your operations, increase efficiency, and grow your portfolio with the most trusted 
              property management platform. Designed specifically for experienced property professionals.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold">
                <Link to="/auth/signup" className="flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold">
                Schedule Demo
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-8 text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">14-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="font-medium">Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                <span className="font-medium">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-gray-200">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "15,000+", label: "Properties Managed", subtext: "Nationwide" },
              { number: "31%", label: "Average ROI Increase", subtext: "Within 6 months" },
              { number: "12+", label: "Hours Saved Weekly", subtext: "Per property manager" },
              { number: "99.2%", label: "Customer Satisfaction", subtext: "Based on 2,500+ reviews" }
            ].map((stat, index) => (
              <div key={index} className="p-4">
                <div className="text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">{stat.label}</div>
                <div className="text-sm text-gray-600">{stat.subtext}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Everything You Need to Manage Properties Efficiently
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Comprehensive tools designed for professional property managers who demand reliability, 
              efficiency, and results.
            </p>
          </div>
          
          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: Building,
                title: "Portfolio Management",
                description: "Centralize all your properties, units, and tenant information with advanced filtering and reporting capabilities.",
                benefits: ["Multi-property dashboard", "Advanced search & filters", "Custom reporting tools"]
              },
              {
                icon: Users,
                title: "Tenant Operations",
                description: "Streamline tenant communications, applications, and service requests with professional-grade tools.",
                benefits: ["Automated communications", "Digital applications", "Maintenance tracking"]
              },
              {
                icon: BarChart3,
                title: "Financial Analytics",
                description: "Track income, expenses, and profitability with detailed financial reports and tax-ready documentation.",
                benefits: ["P&L statements", "Tax reporting", "Cash flow analysis"]
              }
            ].map((feature, index) => (
              <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tools Section */}
          <div className="bg-blue-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Professional Tools Included</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Access our comprehensive suite of professional tools at no additional cost.
            </p>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 bg-blue-700 rounded-lg p-4">
                <FileText className="h-6 w-6 text-blue-200" />
                <div className="text-left">
                  <div className="font-semibold">Lease Generator</div>
                  <div className="text-sm text-blue-200">State-compliant lease agreements</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-700 rounded-lg p-4">
                <Calculator className="h-6 w-6 text-blue-200" />
                <div className="text-left">
                  <div className="font-semibold">Invoice Generator</div>
                  <div className="text-sm text-blue-200">Professional billing templates</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
              ))}
            </div>
            
            <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 mb-8 leading-relaxed">
              "TenantFlow has transformed our property management operations. We've increased efficiency by 40% 
              and our tenants are happier than ever. The platform is intuitive and robust."
            </blockquote>
            
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="font-bold text-gray-900 text-lg">Robert Chen</div>
                <div className="text-gray-600">Senior Property Manager</div>
                <div className="text-gray-500 text-sm">145 Properties • Chicago, IL</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Streamline Your Operations?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of professional property managers who trust TenantFlow to grow their business efficiently.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold">
              <Link to="/auth/signup" className="flex items-center gap-2">
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold">
              <Phone className="h-5 w-5 mr-2" />
              Call (555) 123-4567
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">TenantFlow</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Professional property management software trusted by experienced property managers nationwide.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
                <li><Link to="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/guides" className="hover:text-white transition-colors">Guides</Link></li>
                <li><Link to="/webinars" className="hover:text-white transition-colors">Webinars</Link></li>
                <li><Link to="/case-studies" className="hover:text-white transition-colors">Case Studies</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  (555) 123-4567
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  support@tenantflow.app
                </li>
                <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              &copy; 2024 TenantFlow. All rights reserved.
            </p>
            <div className="flex space-x-6 text-gray-400">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}