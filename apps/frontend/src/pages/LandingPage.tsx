import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// Using Lucide React icons as they're already available in the project
import { Check, ArrowRight, Building, Users, ClipboardList, DollarSign, BarChart3, Shield } from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative container mx-auto px-6 py-24 lg:py-32">
                    <div className="max-w-4xl mx-auto text-center">
                        <Badge variant="secondary" className="mb-6 bg-blue-700/50 text-white border-blue-600">
                            =� Professional Property Management Platform
                        </Badge>
                        <h1 className="text-5xl lg:text-7xl font-bold mb-8 leading-tight">
                            Streamline Your
                            <span className="block bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                                Property Management
                            </span>
                        </h1>
                        <p className="text-xl lg:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                            Manage properties, tenants, leases, and maintenance requests with ease. 
                            Built for property owners who demand professional-grade tools.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/auth/signup">
                                <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-semibold px-8 py-4 text-lg">
                                    Get Started Free
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link to="/tools/lease-generator">
                                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-900 font-semibold px-8 py-4 text-lg">
                                    Try Tools
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
                
                {/* Hero Background Pattern */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                            Everything You Need to Manage Properties
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            From tenant management to maintenance tracking, we've built the complete toolkit for modern property management.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <CardContent className="p-8">
                                <div className="bg-blue-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                    <Building className="h-8 w-8 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Property Management</h3>
                                <p className="text-gray-600 mb-6">
                                    Organize and track all your properties with detailed profiles, photos, and key information.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Property profiles & documentation
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Unit management & availability
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Photo galleries & virtual tours
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <CardContent className="p-8">
                                <div className="bg-green-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                    <Users className="h-8 w-8 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Tenant Management</h3>
                                <p className="text-gray-600 mb-6">
                                    Streamline tenant relationships with digital applications, lease tracking, and communication tools.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Digital tenant applications
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Tenant portal access
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Communication history
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <CardContent className="p-8">
                                <div className="bg-purple-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                    <ClipboardList className="h-8 w-8 text-purple-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Lease Management</h3>
                                <p className="text-gray-600 mb-6">
                                    Generate state-compliant leases, track renewals, and manage lease terms with automated workflows.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        State-compliant lease generation
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Renewal tracking & alerts
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Digital signatures
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <CardContent className="p-8">
                                <div className="bg-orange-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                    <DollarSign className="h-8 w-8 text-orange-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Payment Tracking</h3>
                                <p className="text-gray-600 mb-6">
                                    Monitor rent payments, late fees, and generate professional invoices with automated reminders.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Rent payment tracking
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Professional invoice generation
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Late payment alerts
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <CardContent className="p-8">
                                <div className="bg-red-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                    <BarChart3 className="h-8 w-8 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Maintenance Requests</h3>
                                <p className="text-gray-600 mb-6">
                                    Handle maintenance requests efficiently with tenant portals, contractor management, and tracking.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Tenant request portal
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Contractor coordination
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Status tracking & updates
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <CardContent className="p-8">
                                <div className="bg-indigo-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                    <Shield className="h-8 w-8 text-indigo-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Professional Tools</h3>
                                <p className="text-gray-600 mb-6">
                                    Access professional-grade tools including document generation, legal templates, and compliance tracking.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Document templates
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Compliance tracking
                                    </li>
                                    <li className="flex items-center text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        Professional reporting
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Tools Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                            Professional Tools Available Now
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Start using our professional property management tools today, even before signing up.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <Card className="border-2 border-gray-200 hover:border-blue-300 transition-colors duration-300">
                            <CardContent className="p-8 text-center">
                                <div className="bg-blue-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6">
                                    <ClipboardList className="h-8 w-8 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Lease Generator</h3>
                                <p className="text-gray-600 mb-6">
                                    Generate state-compliant lease agreements with professional templates for all 50 states.
                                </p>
                                <Link to="/tools/lease-generator">
                                    <Button variant="outline" className="w-full">
                                        Try Lease Generator
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="border-2 border-gray-200 hover:border-green-300 transition-colors duration-300">
                            <CardContent className="p-8 text-center">
                                <div className="bg-green-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6">
                                    <DollarSign className="h-8 w-8 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Invoice Generator</h3>
                                <p className="text-gray-600 mb-6">
                                    Create professional invoices for rent, deposits, fees, and other charges with our free tool.
                                </p>
                                <Link to="/tools/invoice-generator">
                                    <Button variant="outline" className="w-full">
                                        Try Invoice Generator
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="border-2 border-gray-200 hover:border-purple-300 transition-colors duration-300">
                            <CardContent className="p-8 text-center">
                                <div className="bg-purple-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6">
                                    <BarChart3 className="h-8 w-8 text-purple-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Maintenance Tracker</h3>
                                <p className="text-gray-600 mb-6">
                                    Track maintenance requests, schedule repairs, and manage contractor relationships efficiently.
                                </p>
                                <Link to="/maintenance">
                                    <Button variant="outline" className="w-full">
                                        Try Maintenance Tracker
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl lg:text-5xl font-bold mb-8">
                        Ready to Transform Your Property Management?
                    </h2>
                    <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
                        Join property owners who have streamlined their operations with our professional-grade platform.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/auth/signup">
                            <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-semibold px-8 py-4 text-lg">
                                Start Free Trial
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link to="/pricing">
                            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-900 font-semibold px-8 py-4 text-lg">
                                View Pricing
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}