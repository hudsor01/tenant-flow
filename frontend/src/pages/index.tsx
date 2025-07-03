import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  CheckCircle,
  Star,
  Users,
  Clock,
  ArrowRight,
  Building,
  DollarSign,
  TrendingUp,
  BarChart3,
  MessageSquare,
  Smartphone,
  Quote,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ChevronDown,
  Calculator,
  Menu,
  X,
  Facebook,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { LocalBusinessSchema } from '@/components/seo/LocalBusinessSchema';
import { generateOrganizationStructuredData } from '@/lib/seo-utils';

export default function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Sample testimonials - replace with real customer testimonials
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Property Owner",
      properties: "12 units",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face&auto=format",
      quote: "TenantFlow saved me 15+ hours per week. The automated rent tracking and maintenance requests have completely transformed how I manage my properties.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Real Estate Investor",
      properties: "8 properties",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face&auto=format",
      quote: "The lease generator alone paid for itself in the first month. Professional templates that keep me compliant while saving legal fees.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Property Manager",
      properties: "25+ units",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face&auto=format",
      quote: "Switched from spreadsheets to TenantFlow and never looked back. My tenants love the transparency and I love the efficiency.",
      rating: 5
    }
  ];

  const stats = [
    { label: "Properties Managed", value: "10,000+", icon: Building },
    { label: "Hours Saved Monthly", value: "50,000+", icon: Clock },
    { label: "Customer Satisfaction", value: "98%", icon: Star },
    { label: "Average ROI Increase", value: "23%", icon: TrendingUp }
  ];

  const organizationStructuredData = generateOrganizationStructuredData();

  return (
    <>
      <SEO
        title="TenantFlow - Modern Property Management Software"
        description="Streamline your property management with TenantFlow. Manage tenants, properties, maintenance requests, and finances all in one powerful platform. Start your free trial today."
        keywords="property management software, tenant management, rental properties, landlord tools, property manager, lease management, maintenance tracking"
        type="website"
        canonical="https://tenantflow.app"
        structuredData={organizationStructuredData}
      />
      
      <LocalBusinessSchema 
        serviceArea={["United States", "Canada", "United Kingdom", "Australia"]}
        priceRange="$49-$399"
      />
      
      <div className="min-h-screen bg-background overflow-x-hidden relative">
        {/* Global Background Elements */}
        <div className="fixed inset-0 bg-gradient-to-br from-primary/3 via-background to-secondary/3 -z-10"></div>
        <div className="fixed inset-0 bg-[linear-gradient(45deg,transparent_48%,rgb(142,76,36,0.03)_49%,rgb(142,76,36,0.03)_51%,transparent_52%)] bg-[length:20px_20px] -z-10"></div>
        <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,rgb(142,76,36,0.05)_0%,transparent_25%),radial-gradient(circle_at_75%_75%,rgb(142,76,36,0.03)_0%,transparent_25%)] -z-10"></div>
        
        {/* Geometric Accent Elements */}
        <div className="fixed top-20 left-8 w-64 h-64 bg-gradient-to-r from-primary/5 to-transparent rounded-full blur-3xl -z-10"></div>
        <div className="fixed bottom-20 right-8 w-96 h-96 bg-gradient-to-l from-secondary/5 to-transparent rounded-full blur-3xl -z-10"></div>
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-transparent via-primary/2 to-transparent rounded-full blur-3xl -z-10"></div>
      {/* Enhanced Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                TenantFlow
              </span>
            </div>
            
            {/* Desktop Menu - Centered */}
            <div className="hidden lg:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
              {/* Tools Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 text-lg font-medium px-4 py-2"
                  >
                    Tools
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 bg-white/95 backdrop-blur-xl border shadow-xl">
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/lease-generator" className="flex items-center gap-3 px-4 py-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold">Lease Generator</span>
                        <span className="text-base text-muted-foreground">Create legal lease agreements</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/invoice-generator" className="flex items-center gap-3 px-4 py-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Calculator className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold">Invoice Generator</span>
                        <span className="text-base text-muted-foreground">Professional invoice templates</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                to="/blog"
                className="text-lg font-medium text-muted-foreground hover:text-foreground transition-all duration-200 relative group px-3 py-2"
              >
                Blog
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
              </Link>
              <Link
                to="/pricing"
                className="text-lg font-medium text-muted-foreground hover:text-foreground transition-all duration-200 relative group px-3 py-2"
              >
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
              </Link>
            </div>

            {/* Auth Buttons - Right Side */}
            <div className="hidden lg:flex items-center space-x-4">
              <Button
                variant="ghost"
                className="hover:bg-primary/10 text-lg font-medium px-6 py-3"
                asChild
              >
                <Link to="/auth/login">Sign In</Link>
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-lg font-semibold px-8 py-3 flex items-center justify-center"
                asChild
              >
                <Link to="/auth/signup">Start Free Trial</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-3 hover:bg-primary/10 rounded-lg transition-colors duration-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-8 w-8" />
              ) : (
                <Menu className="h-8 w-8" />
              )}
            </button>
          </div>
        </div>

          {/* Mobile Menu */}
          <div
            className={`lg:hidden transition-all duration-300 ease-in-out ${
              isMobileMenuOpen
                ? "max-h-96 opacity-100 pb-6"
                : "max-h-0 opacity-0 overflow-hidden"
            }`}
          >
            <div className="space-y-4 pt-4 border-t border-border/40">
              <a
                href="#features"
                className="block py-2 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="block py-2 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <div className="pt-4 space-y-3">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/auth/login">Sign In</Link>
                </Button>
                <Button className="w-full bg-primary hover:bg-primary/90" asChild>
                  <Link to="/auth/signup">Start Free Trial</Link>
                </Button>
              </div>
            </div>
          </div>
      </nav>

      {/* Enhanced Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-6xl mx-auto">

            {/* Enhanced Headline */}
            <h1 className="text-display mb-10">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Transform Your Property
              </span>
              <br />
              <span className="text-[#1e293b]">Management Today</span>
            </h1>

            {/* Enhanced Subtitle */}
            <p className="text-xl leading-relaxed text-muted-foreground mb-12 max-w-4xl mx-auto">
              Join 10,000+ landlords who increased their rental income by 23% with TenantFlow's 
              all-in-one property management platform.{" "}
              <span className="text-primary font-semibold">
                Transform your property business with modern insights.
              </span>
            </p>
            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Button
                size="lg"
                className="px-10 py-6 text-lg font-semibold bg-primary hover:bg-primary/90 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl group flex items-center justify-center"
                asChild
              >
                <Link to="/pricing">Start Free Trial</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-10 py-6 text-lg font-semibold border-2 hover:bg-primary/5 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center"
                asChild
              >
                <Link to="/lease-generator">
                  Generate a Lease!
                </Link>
              </Button>
            </div>

            {/* Enhanced Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-lg text-muted-foreground mb-16">
              <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                <CheckCircle className="h-6 w-6 text-primary mr-3" />
                <span className="font-medium">No setup fees</span>
              </div>
              <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                <CheckCircle className="h-6 w-6 text-primary mr-3" />
                <span className="font-medium">14-day free trial</span>
              </div>
              <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                <CheckCircle className="h-6 w-6 text-primary mr-3" />
                <span className="font-medium">Cancel anytime</span>
              </div>
              <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                <Shield className="h-6 w-6 text-primary mr-3" />
                <span className="font-medium">Enterprise security</span>
              </div>
            </div>

            {/* Social Proof Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center mb-2">
                    <stat.icon className="h-6 w-6 text-primary mr-2" />
                    <span className="text-2xl md:text-3xl font-bold text-foreground">
                      {stat.value}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Problem/Solution Section */}
      <section className="relative py-24 bg-secondary/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-secondary/3"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgb(142,76,36,0.08)_0%,transparent_40%)]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <h2 className="text-heading mb-8">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Stop Losing Money on Manual Property Management
              </span>
            </h2>
            <p className="text-xl leading-relaxed text-muted-foreground max-w-4xl mx-auto">
              Most landlords waste 15+ hours weekly on spreadsheets, phone calls, and paperwork. 
              TenantFlow automates everything, so you can focus on growing your portfolio.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Before: Manual Process */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <h3 className="text-2xl font-bold mb-6 text-destructive">❌ Before TenantFlow</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-error border border-destructive/20 rounded-lg">
                    <div className="w-2 h-2 bg-destructive rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-destructive-foreground">Hours lost on spreadsheets</p>
                      <p className="text-sm text-destructive">Tracking rent payments, expenses, and tenant data manually</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-error border border-destructive/20 rounded-lg">
                    <div className="w-2 h-2 bg-destructive rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-destructive-foreground">Missed rent payments</p>
                      <p className="text-sm text-destructive">No automated reminders or tracking systems</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-error border border-destructive/20 rounded-lg">
                    <div className="w-2 h-2 bg-destructive rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-destructive-foreground">Legal compliance risks</p>
                      <p className="text-sm text-destructive">Using generic lease templates and missing disclosures</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* After: TenantFlow */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative">
                <h3 className="text-2xl font-bold mb-6 text-success">✅ After TenantFlow</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-success border border-success rounded-lg">
                    <CheckCircle className="w-5 h-5 text-success mt-1" />
                    <div>
                      <p className="font-semibold text-success-foreground">Automated everything</p>
                      <p className="text-sm text-success">Rent tracking, late fees, and financial reports generated automatically</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-success border border-success rounded-lg">
                    <CheckCircle className="w-5 h-5 text-success mt-1" />
                    <div>
                      <p className="font-semibold text-success-foreground">Never miss payments</p>
                      <p className="text-sm text-success">Automatic reminders and real-time payment notifications</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-success border border-success rounded-lg">
                    <CheckCircle className="w-5 h-5 text-success mt-1" />
                    <div>
                      <p className="font-semibold text-success-foreground">Legal protection included</p>
                      <p className="text-sm text-success">State-specific lease templates with all required disclosures</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div {...fadeInUp} className="text-center">
            <Link to="/pricing">
              <Button size="lg" className="text-lg px-12 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                <div className="flex items-center gap-2">
                  <span>Transform Your Business Today</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Join thousands of landlords saving 15+ hours per week
            </p>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-heading mb-8">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Loved by 10,000+ Landlords
              </span>
            </h2>
            <p className="text-xl leading-relaxed text-muted-foreground max-w-3xl mx-auto">
              See why property owners trust TenantFlow to manage their investments
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <Card className="p-8 border-2 shadow-lg">
                <CardContent>
                  <Quote className="h-12 w-12 text-primary mx-auto mb-6" />
                  <blockquote className="text-xl md:text-2xl font-medium mb-8 text-foreground leading-relaxed">
                    "{testimonials[currentTestimonial].quote}"
                  </blockquote>
                  
                  <div className="flex items-center justify-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={testimonials[currentTestimonial].image} alt={testimonials[currentTestimonial].name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                        {testimonials[currentTestimonial].name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-bold text-lg">{testimonials[currentTestimonial].name}</div>
                      <div className="text-muted-foreground">{testimonials[currentTestimonial].role}</div>
                      <div className="text-sm text-primary font-medium">{testimonials[currentTestimonial].properties}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center mt-4">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Navigation */}
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))}
                className="rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentTestimonial ? 'bg-primary' : 'bg-primary/20'
                    }`}
                  />
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))}
                className="rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/5 to-background"></div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <h2 className="text-heading mb-8">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Complete Property Management In One Platform
              </span>
            </h2>
            <p className="text-xl leading-relaxed text-muted-foreground max-w-4xl mx-auto">
              Everything you need to manage properties efficiently, increase revenue, and provide 
              exceptional tenant experiences—all in one intuitive platform.
            </p>
          </div>

          <motion.div 
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <motion.div variants={fadeInUp}>
              <Card className="h-full border-2 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">Smart Tenant Management</CardTitle>
                  <CardDescription>
                    Comprehensive tenant profiles with lease tracking, communication history, 
                    and automated reminders for renewals and important dates.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border-2 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">Automated Rent Collection</CardTitle>
                  <CardDescription>
                    Track payments in real-time, automate late fee calculations, 
                    and generate detailed financial reports for tax season.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border-2 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">Smart Document Center</CardTitle>
                  <CardDescription>
                    State-specific lease templates, automatic compliance tracking, 
                    and secure cloud storage for all property documents.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border-2 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">Advanced Analytics</CardTitle>
                  <CardDescription>
                    Performance dashboards, cash flow forecasting, and ROI tracking 
                    to make data-driven decisions about your portfolio.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border-2 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">Maintenance Hub</CardTitle>
                  <CardDescription>
                    Streamlined maintenance requests, vendor management, 
                    and automated notifications to keep properties in top condition.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="h-full border-2 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">Mobile-First Design</CardTitle>
                  <CardDescription>
                    Manage properties on-the-go with our responsive design. 
                    Access everything from your phone or tablet, anywhere, anytime.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div {...fadeInUp} className="text-center mt-16">
            <Link to="/lease-generator">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 mr-4 transition-all duration-300 hover:scale-105 hover:bg-primary/10 hover:text-primary hover:border-primary">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span>Try Free Lease Generator</span>
                </div>
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" className="text-lg px-8 py-6 transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  <span>Start Free Trial</span>
                </div>
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Enhanced ROI Calculator Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/10 via-background to-secondary/10"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <h2 className="text-heading mb-8">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Calculate Your Time & Money Savings
              </span>
            </h2>
            <p className="text-xl leading-relaxed text-muted-foreground max-w-4xl mx-auto">
              See how much TenantFlow can save you compared to manual property management
            </p>
          </div>

          {/* ROI Visual */}
          <div className="max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src="https://images.unsplash.com/photo-1617118602031-1edde7582212?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="ROI measurement and financial analytics"
                className="w-full h-64 md:h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">Measure Your Success</h3>
                  <p className="text-lg opacity-90">Track ROI and maximize your property investments</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Calculator Input Side */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Card className="p-8 border-2">
                  <CardHeader>
                    <CardTitle className="text-2xl">Your Current Situation</CardTitle>
                    <CardDescription>Tell us about your property portfolio</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Number of Properties</label>
                          <div className="text-3xl font-bold text-primary">5</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Hours Spent Weekly</label>
                          <div className="text-3xl font-bold text-primary">12</div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-4 bg-error rounded-lg">
                            <div className="text-2xl font-bold text-destructive">$2,400</div>
                            <div className="text-sm text-destructive">Monthly time cost</div>
                            <div className="text-xs text-muted-foreground">at $50/hour</div>
                          </div>
                          <div className="p-4 bg-error rounded-lg">
                            <div className="text-2xl font-bold text-destructive">$28,800</div>
                            <div className="text-sm text-destructive">Annual time cost</div>
                            <div className="text-xs text-muted-foreground">not including stress</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Results Side */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="p-8 border-2 border-success bg-success/50">
                  <CardHeader>
                    <CardTitle className="text-2xl text-success-foreground">With TenantFlow</CardTitle>
                    <CardDescription className="text-success">Your projected savings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-success mb-2">85%</div>
                          <div className="text-sm text-success-foreground">Time Savings</div>
                          <div className="text-xs text-muted-foreground">10+ hours saved weekly</div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-success mb-2">$199</div>
                          <div className="text-sm text-success-foreground">TenantFlow Cost</div>
                          <div className="text-xs text-muted-foreground">per month</div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-success">
                        <div className="text-center p-6 bg-success/80 rounded-lg">
                          <div className="text-4xl font-bold text-success-foreground mb-2">$2,201</div>
                          <div className="text-lg font-semibold text-success-foreground">Net Monthly Savings</div>
                          <div className="text-sm text-success">$26,412 saved annually</div>
                        </div>
                        
                        <div className="mt-4 text-center">
                          <div className="text-2xl font-bold text-success-foreground">ROI: 1,106%</div>
                          <div className="text-sm text-muted-foreground">TenantFlow pays for itself in 4 days</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.div {...fadeInUp} className="text-center mt-12">
              <Link to="/pricing">
                <Button size="lg" className="text-lg px-12 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                  <div className="flex items-center gap-2">
                    <span>Start Saving Today - 14 Day Free Trial</span>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                * Calculations based on average customer data. Individual results may vary.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced Final CTA Section */}
      <section className="relative py-24 bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="max-w-6xl mx-auto">
            
            <h2 className="text-heading mb-8">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Ready to 10x Your Efficiency?
              </span>
            </h2>
            
            <p className="text-xl leading-relaxed text-muted-foreground mb-12 max-w-4xl mx-auto">
              Join 10,000+ successful landlords who've transformed their property management. 
              Start your free trial today and see results in your first week.
            </p>

            {/* Trust Signals */}
            <div className="flex flex-wrap items-center justify-center gap-8 mb-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>30-day money-back guarantee</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Link to="/pricing">
                <Button size="lg" className="text-xl px-16 py-8 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                  <div className="flex items-center gap-3">
                    <Building className="h-6 w-6" />
                    <span>Start Your Transformation</span>
                    <ArrowRight className="h-6 w-6" />
                  </div>
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-xl px-12 py-8 border-2 transition-all duration-300 hover:scale-105 hover:bg-primary/10 hover:text-primary hover:border-primary"
                onClick={() => {
                  // Scroll to features section
                  const featuresSection = document.getElementById('features');
                  if (featuresSection) {
                    featuresSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <Building className="h-6 w-6" />
                  <span>Explore Platform</span>
                </div>
              </Button>
            </div>

            {/* Final Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">15+</div>
                <div className="text-sm text-muted-foreground">Hours saved weekly</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">23%</div>
                <div className="text-sm text-muted-foreground">Average revenue increase</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">&lt; 1 Week</div>
                <div className="text-sm text-muted-foreground">To see results</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Preview Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Stay Ahead with Expert 
              <span className="text-primary"> Property Management</span> Insights
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Get actionable tips, industry trends, and proven strategies from property management experts. 
              Learn how to maximize your rental income and streamline operations.
            </p>
            <Link to="/blog">
              <Button size="lg" className="mb-8 transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Explore All Articles</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </Button>
            </Link>
          </motion.div>

          {/* Featured Blog Articles Preview */}
          <motion.div 
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            <motion.div variants={fadeInUp}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    Best Lease Agreement Generators for Landlords in 2025
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    Compare the top lease agreement generators and learn how to create legally compliant leases that protect your investment...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">5 min read</span>
                    <Link to="/blog" className="text-primary hover:underline text-sm font-medium">
                      Read More →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    Ultimate Tenant Screening Checklist for 2025
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    Avoid problem tenants with our comprehensive screening process. Download our free checklist and protect your rental income...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">8 min read</span>
                    <Link to="/blog" className="text-primary hover:underline text-sm font-medium">
                      Read More →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    How to Set Up Automated Rent Collection (Step-by-Step)
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    Eliminate late payments and reduce admin work with automated rent collection. Our complete guide shows you exactly how...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">12 min read</span>
                    <Link to="/blog" className="text-primary hover:underline text-sm font-medium">
                      Read More →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Blog Stats */}
          <motion.div {...fadeInUp} className="text-center mt-16">
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">50+</div>
                <div className="text-sm text-muted-foreground">Expert Articles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">25k+</div>
                <div className="text-sm text-muted-foreground">Monthly Readers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">Weekly</div>
                <div className="text-sm text-muted-foreground">New Content</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t bg-card py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Brand */}
            <div className="flex items-center space-x-2">
              <Building className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">TenantFlow</span>
            </div>

            {/* Main Links */}
            <div className="flex items-center gap-6 text-sm">
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <a 
                href="mailto:support@tenantflow.app" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Support
              </a>
            </div>

            {/* Social & Copyright */}
            <div className="flex items-center gap-4">
              <a 
                href="https://facebook.com/tenantflow" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <div className="text-sm text-muted-foreground">
                © 2025 TenantFlow
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}