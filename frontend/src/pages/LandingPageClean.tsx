import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users,
  CheckCircle,
  ArrowRight,
  Star,
  BarChart3,
  Shield,
  Clock,
  Zap,
  TrendingUp,
  Globe,
  Home,
  ChevronDown,
  Wrench,
  FileText,
  Calculator
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function LandingPageClean() {
  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }
  };

  const fadeInLeft = {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }
  };

  return (
    <>
      <SEO 
        title="TenantFlow - Property Management Software"
        description="Streamline your property management with TenantFlow. Manage properties, tenants, and leases efficiently."
        keywords="property management, landlord software, tenant management, lease management"
        canonical="https://tenantflow.app"
      />
      
      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-gray-900">TenantFlow</span>
              </Link>
              
              <div className="hidden md:flex items-center space-x-1">
                {/* Tools Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center gap-2 font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Wrench className="h-4 w-4" />
                      Tools
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 bg-white/95 backdrop-blur-xl border shadow-xl">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/lease-generator" className="flex items-center gap-3 px-4 py-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Lease Generator</span>
                          <span className="text-xs text-gray-500">Create legal lease agreements</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/invoice-generator" className="flex items-center gap-3 px-4 py-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Calculator className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Invoice Generator</span>
                          <span className="text-xs text-gray-500">Professional invoice templates</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link to="/pricing" className="text-gray-600 hover:text-gray-900 font-medium transition-colors px-3 py-2">
                  Pricing
                </Link>
                <Link to="/blog" className="text-gray-600 hover:text-gray-900 font-medium transition-colors px-3 py-2">
                  Blog
                </Link>
                <Link to="/auth/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors px-3 py-2">
                  Sign In
                </Link>
                <Button asChild className="rounded-full ml-4">
                  <Link to="/auth/signup">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23f8fafc%22%20fill-opacity%3D%220.4%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerChildren}
              className="text-center max-w-5xl mx-auto"
            >
              <motion.div variants={fadeInUp} className="mb-8">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 px-6 py-3 text-sm font-medium rounded-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Trusted by 15,000+ property managers
                </Badge>
              </motion.div>
              
              <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-gray-900 leading-tight">
                Property Management
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800">
                  Made Simple
                </span>
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Streamline your rental business with our all-in-one platform. 
                Manage properties, tenants, and finances in one powerful dashboard.
              </motion.p>
              
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <Button size="lg" asChild className="rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all">
                  <Link to="/auth/signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-lg border-2 hover:bg-gray-50">
                  <Globe className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Cancel anytime</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerChildren}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
            >
              <motion.div variants={fadeInUp} className="p-6">
                <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">15,000+</div>
                <div className="text-gray-600 font-medium">Properties Managed</div>
              </motion.div>
              <motion.div variants={fadeInUp} className="p-6">
                <div className="text-4xl md:text-5xl font-bold text-green-600 mb-3">31%</div>
                <div className="text-gray-600 font-medium">Average ROI Increase</div>
              </motion.div>
              <motion.div variants={fadeInUp} className="p-6">
                <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-3">12+</div>
                <div className="text-gray-600 font-medium">Hours Saved Weekly</div>
              </motion.div>
              <motion.div variants={fadeInUp} className="p-6">
                <div className="text-4xl md:text-5xl font-bold text-purple-600 mb-3">99.2%</div>
                <div className="text-gray-600 font-medium">Customer Satisfaction</div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerChildren}
              className="text-center mb-20"
            >
              <motion.div variants={fadeInUp} className="mb-6">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-4 py-2">
                  <Zap className="w-4 h-4 mr-2" />
                  Powerful Features
                </Badge>
              </motion.div>
              
              <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                Everything you need to manage properties
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                From tenant screening to rent collection, we've got you covered with enterprise-grade tools
              </motion.p>
            </motion.div>
            
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerChildren}
              className="grid md:grid-cols-3 gap-8 lg:gap-12"
            >
              <motion.div variants={fadeInUp}>
                <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white h-full">
                  <CardHeader className="p-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Building className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-4">Property Management</CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <p className="text-gray-600 leading-relaxed text-lg">
                      Centralize all your properties, units, and tenant information in one intuitive dashboard designed for efficiency.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div variants={fadeInUp}>
                <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white h-full">
                  <CardHeader className="p-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-4">Tenant Portal</CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <p className="text-gray-600 leading-relaxed text-lg">
                      Provide tenants with a modern portal for payments, maintenance requests, and seamless communication.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div variants={fadeInUp}>
                <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white h-full">
                  <CardHeader className="p-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-4">Financial Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <p className="text-gray-600 leading-relaxed text-lg">
                      Track income, expenses, and profitability with real-time analytics and comprehensive reporting.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="py-24 bg-gradient-to-br from-blue-50 via-purple-50 to-gray-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23f8fafc%22%20fill-opacity%3D%220.3%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerChildren}
              className="max-w-5xl mx-auto text-center"
            >
              <motion.div variants={fadeInUp} className="mb-8">
                <Badge variant="outline" className="bg-white/80 text-purple-700 border-purple-200 px-4 py-2">
                  <Shield className="w-4 h-4 mr-2" />
                  Customer Success Story
                </Badge>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="flex justify-center mb-8">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-8 w-8 text-yellow-400 fill-current mx-1" />
                ))}
              </motion.div>
              
              <motion.blockquote variants={fadeInUp} className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-12 leading-tight">
                "TenantFlow has transformed how I manage my properties. I've increased my rental income by 
                <span className="text-green-600"> 28%</span> while cutting my workload in <span className="text-blue-600">half</span>."
              </motion.blockquote>
              
              <motion.div variants={fadeInUp} className="flex items-center justify-center">
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">SJ</span>
                    </div>
                    <div className="text-left">
                      <div className="text-xl font-bold text-gray-900">Sarah Johnson</div>
                      <div className="text-gray-600 font-medium">Property Owner, 12 units</div>
                      <div className="text-sm text-blue-600 font-medium">⭐ 4.9/5 rating</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerChildren}
              className="max-w-4xl mx-auto"
            >
              <motion.div variants={fadeInUp} className="mb-8">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-6 py-3">
                  <Clock className="w-4 h-4 mr-2" />
                  Limited Time Offer
                </Badge>
              </motion.div>
              
              <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
                Ready to simplify your 
                <span className="block text-yellow-300">property management?</span>
              </motion.h2>
              
              <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
                Join thousands of property managers who trust TenantFlow to grow their business and save time every day.
              </motion.p>
              
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button size="lg" variant="secondary" asChild className="rounded-full px-10 py-6 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all">
                  <Link to="/auth/signup">
                    Start Your Free Trial
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-10 py-6 text-lg font-semibold border-2 border-white/30 text-white hover:bg-white/10">
                  <Globe className="mr-3 h-5 w-5" />
                  Schedule Demo
                </Button>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  <span className="font-medium">14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  <span className="font-medium">No setup fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  <span className="font-medium">Cancel anytime</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerChildren}
            >
              <motion.div variants={fadeInUp} className="flex flex-col md:flex-row justify-between items-center mb-12">
                <div className="flex items-center space-x-3 mb-6 md:mb-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Home className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-white">TenantFlow</span>
                </div>
                
                <div className="flex space-x-8 text-gray-400">
                  <Link to="/privacy" className="hover:text-white transition-colors font-medium">Privacy</Link>
                  <Link to="/terms" className="hover:text-white transition-colors font-medium">Terms</Link>
                  <Link to="/contact" className="hover:text-white transition-colors font-medium">Contact</Link>
                  <Link to="/blog" className="hover:text-white transition-colors font-medium">Blog</Link>
                </div>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="border-t border-gray-800 pt-8 text-center">
                <p className="text-gray-400 text-lg">&copy; 2024 TenantFlow. All rights reserved.</p>
                <p className="text-gray-500 mt-2">Built with care for property managers worldwide.</p>
              </motion.div>
            </motion.div>
          </div>
        </footer>
      </div>
    </>
  );
}