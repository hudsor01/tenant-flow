import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// Using Lucide React icons as they're already available in the project
import { Check, ArrowRight, Building, Users, ClipboardList, DollarSign, BarChart3, Shield, Star, Calendar, FileText } from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
                </div>
                
                <div className="relative">
                    <div className="container mx-auto px-6 py-20 lg:py-32">
                        <motion.div 
                            className="max-w-5xl mx-auto text-center"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <Badge 
                                    variant="secondary" 
                                    className="mb-8 bg-blue-500/10 text-blue-200 border-blue-500/20 px-6 py-2 text-sm font-medium backdrop-blur-sm"
                                >
                                    <Star className="w-4 h-4 mr-2" />
                                    Professional Property Management Platform
                                </Badge>
                            </motion.div>
                            
                            <motion.h1 
                                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-[1.1] tracking-tight"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                            >
                                Streamline Your{' '}
                                <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                                    Property Management
                                </span>
                            </motion.h1>
                            
                            <motion.p 
                                className="text-xl lg:text-2xl text-blue-100/90 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                            >
                                Manage properties, tenants, leases, and maintenance requests with ease. 
                                Built for property owners who demand professional-grade tools.
                            </motion.p>
                            
                            <motion.div 
                                className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.5 }}
                            >
                                <Link to="/auth/signup">
                                    <Button 
                                        size="lg" 
                                        className="group bg-white text-blue-900 hover:bg-blue-50 font-semibold px-10 py-4 text-lg h-14 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
                                    >
                                        Get Started Free
                                        <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                                    </Button>
                                </Link>
                                <Link to="/tools/lease-generator">
                                    <Button 
                                        size="lg" 
                                        variant="outline" 
                                        className="border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-semibold px-10 py-4 text-lg h-14 backdrop-blur-sm transition-all duration-300"
                                    >
                                        Try Tools Free
                                    </Button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                    
                    {/* Enhanced Bottom Gradient */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
                <div className="container mx-auto px-6">
                    <motion.div 
                        className="text-center mb-20"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                            Everything You Need to{' '}
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Manage Properties
                            </span>
                        </h2>
                        <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto font-light leading-relaxed">
                            From tenant management to maintenance tracking, we've built the complete toolkit for modern property management.
                        </p>
                    </motion.div>

                    <motion.div 
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, staggerChildren: 0.1 }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2">
                                <CardContent className="p-8">
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Building className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">Property Management</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Organize and track all your properties with detailed profiles, photos, and key information.
                                    </p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Property profiles & documentation
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Unit management & availability
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Photo galleries & virtual tours
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2">
                                <CardContent className="p-8">
                                    <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Users className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors duration-300">Tenant Management</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Streamline tenant relationships with digital applications, lease tracking, and communication tools.
                                    </p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Digital tenant applications
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Tenant portal access
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Communication history
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2">
                                <CardContent className="p-8">
                                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <ClipboardList className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors duration-300">Lease Management</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Generate state-compliant leases, track renewals, and manage lease terms with automated workflows.
                                    </p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            State-compliant lease generation
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Renewal tracking & alerts
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Digital signatures
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2">
                                <CardContent className="p-8">
                                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <DollarSign className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors duration-300">Payment Tracking</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Monitor rent payments, late fees, and generate professional invoices with automated reminders.
                                    </p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Rent payment tracking
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Professional invoice generation
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Late payment alerts
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2">
                                <CardContent className="p-8">
                                    <div className="bg-gradient-to-br from-red-500 to-red-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <BarChart3 className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-red-600 transition-colors duration-300">Maintenance Requests</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Handle maintenance requests efficiently with tenant portals, contractor management, and tracking.
                                    </p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Tenant request portal
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Contractor coordination
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Status tracking & updates
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                        >
                            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2">
                                <CardContent className="p-8">
                                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Shield className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors duration-300">Professional Tools</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Access professional-grade tools including document generation, legal templates, and compliance tracking.
                                    </p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Document templates
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Compliance tracking
                                        </li>
                                        <li className="flex items-center text-sm text-gray-600">
                                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                            Professional reporting
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Tools Section */}
            <section className="py-24 bg-gradient-to-b from-white to-gray-50">
                <div className="container mx-auto px-6">
                    <motion.div 
                        className="text-center mb-20"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                            Professional Tools{' '}
                            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                Available Now
                            </span>
                        </h2>
                        <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto font-light leading-relaxed">
                            Start using our professional property management tools today, even before signing up.
                        </p>
                    </motion.div>

                    <motion.div 
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, staggerChildren: 0.1 }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2">
                                <CardContent className="p-8 text-center">
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <ClipboardList className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">Lease Generator</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Generate state-compliant lease agreements with professional templates for all 50 states.
                                    </p>
                                    <Link to="/tools/lease-generator">
                                        <Button variant="outline" className="w-full group-hover:bg-blue-50 group-hover:border-blue-300 group-hover:text-blue-600 transition-all duration-300">
                                            Try Lease Generator
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2">
                                <CardContent className="p-8 text-center">
                                    <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <DollarSign className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors duration-300">Invoice Generator</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Create professional invoices for rent, deposits, fees, and other charges with our free tool.
                                    </p>
                                    <Link to="/tools/invoice-generator">
                                        <Button variant="outline" className="w-full group-hover:bg-green-50 group-hover:border-green-300 group-hover:text-green-600 transition-all duration-300">
                                            Try Invoice Generator
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2">
                                <CardContent className="p-8 text-center">
                                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <BarChart3 className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors duration-300">Maintenance Tracker</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Track maintenance requests, schedule repairs, and manage contractor relationships efficiently.
                                    </p>
                                    <Link to="/maintenance">
                                        <Button variant="outline" className="w-full group-hover:bg-purple-50 group-hover:border-purple-300 group-hover:text-purple-600 transition-all duration-300">
                                            Try Maintenance Tracker
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-24 bg-gradient-to-br from-blue-950 via-indigo-900 to-purple-900 text-white overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.03%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
                </div>
                
                <div className="relative">
                    <div className="container mx-auto px-6 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <h2 className="text-4xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-tight tracking-tight">
                                Ready to Transform Your{' '}
                                <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                                    Property Management?
                                </span>
                            </h2>
                            <p className="text-xl lg:text-2xl text-blue-100/90 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
                                Join thousands of property owners who have streamlined their operations with our professional-grade platform.
                            </p>
                            <motion.div 
                                className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <Link to="/auth/signup">
                                    <Button 
                                        size="lg" 
                                        className="group bg-white text-blue-900 hover:bg-blue-50 font-semibold px-10 py-4 text-lg h-14 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
                                    >
                                        Start Free Trial
                                        <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                                    </Button>
                                </Link>
                                <Link to="/pricing">
                                    <Button 
                                        size="lg" 
                                        variant="outline" 
                                        className="border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-semibold px-10 py-4 text-lg h-14 backdrop-blur-sm transition-all duration-300"
                                    >
                                        View Pricing
                                    </Button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    )
}