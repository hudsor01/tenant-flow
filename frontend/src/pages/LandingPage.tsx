import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Play,
  Quote,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ChevronDown,
  Calculator,
  Wrench
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { LocalBusinessSchema } from '@/components/seo/LocalBusinessSchema';
import { generateOrganizationStructuredData } from '@/lib/seo-utils';

export default function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

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
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="border-b bg-card/95 backdrop-blur-xl sticky top-0 z-50 shadow-sm/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 group transition-all duration-300 hover:scale-105">
              <motion.div
                whileHover={{ rotate: 5, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
              >
                <Building className="h-8 w-8 text-primary" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text group-hover:from-primary group-hover:to-primary/80 transition-all duration-300">
                TenantFlow
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1">
              {/* Tools Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-1 font-medium transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                  >
                    <Wrench className="h-4 w-4" />
                    Tools
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-card/95 backdrop-blur-xl border shadow-xl">
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/lease-generator" className="flex items-center gap-3 px-3 py-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="font-medium">Lease Generator</span>
                        <span className="text-xs text-muted-foreground">Create legal lease agreements</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/invoice-generator" className="flex items-center gap-3 px-3 py-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="font-medium">Invoice Generator</span>
                        <span className="text-xs text-muted-foreground">Professional invoice templates</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to="/blog">
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 font-medium transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                >
                  <BookOpen className="h-4 w-4" />
                  Blog
                </Button>
              </Link>
              
              <Link to="/pricing">
                <Button 
                  variant="ghost"
                  className="flex items-center gap-2 font-medium transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                >
                  <DollarSign className="h-4 w-4" />
                  Pricing
                </Button>
              </Link>
              
              <Link to="/auth/login">
                <Button 
                  variant="ghost"
                  className="font-medium transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                >
                  Sign In
                </Button>
              </Link>
              
              <Link to="/auth/signup">
                <Button 
                  className="ml-2 font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile menu button - you can enhance this later */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                Menu
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
        <div className="container mx-auto text-center relative">
          <motion.div {...fadeInUp}>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Badge variant="secondary" className="mb-0">
                <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                4.9/5 from 500+ customers
              </Badge>
              <Badge variant="outline" className="mb-0">
                <TrendingUp className="h-4 w-4 mr-1 text-success" />
                #1 Fastest Growing
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Transform Your Property
              <br />
              <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text">
                Management Today
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto font-medium">
              Join 10,000+ landlords who increased their rental income by 23% with TenantFlow's 
              all-in-one property management platform.
            </p>
            
            <div className="flex items-center justify-center gap-6 mb-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Cancel anytime</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/pricing">
                <Button size="lg" className="text-lg px-12 py-6 shadow-lg hover:shadow-xl transition-shadow">
                  <Building className="mr-2 h-5 w-5" />
                  Start Your Free Trial
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 border-2"
                onClick={() => {
                  // Scroll to features section
                  const featuresSection = document.getElementById('features');
                  if (featuresSection) {
                    featuresSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <Play className="mr-2 h-5 w-5" />
                See Features
              </Button>
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
          </motion.div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto">
          <motion.div 
            {...fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Stop Losing Money on 
              <span className="text-primary"> Manual Property Management</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Most landlords waste 15+ hours weekly on spreadsheets, phone calls, and paperwork. 
              TenantFlow automates everything, so you can focus on growing your portfolio.
            </p>
          </motion.div>

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
              <Button size="lg" className="text-lg px-12 py-6 shadow-lg">
                Transform Your Business Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Join thousands of landlords saving 15+ hours per week
            </p>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div 
            {...fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Loved by <span className="text-primary">10,000+ Landlords</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              See why property owners trust TenantFlow to manage their investments
            </p>
          </motion.div>

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

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto">
          <motion.div 
            {...fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Complete Property Management 
              <span className="text-primary"> In One Platform</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to manage properties efficiently, increase revenue, and provide 
              exceptional tenant experiences—all in one intuitive platform.
            </p>
          </motion.div>

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
                    <Badge variant="secondary">Most Popular</Badge>
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
                    <Badge variant="outline">Revenue Boost</Badge>
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
                    <Badge variant="outline">Legal Safe</Badge>
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
                    <Badge variant="outline">Mobile Ready</Badge>
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
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 mr-4">
                <FileText className="mr-2 h-5 w-5" />
                Try Free Lease Generator
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" className="text-lg px-8 py-6">
                <Building className="mr-2 h-5 w-5" />
                Start Free Trial
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div 
            {...fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Calculate Your <span className="text-primary">Time & Money Savings</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              See how much TenantFlow can save you compared to manual property management
            </p>
          </motion.div>

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
                <Button size="lg" className="text-lg px-12 py-6 shadow-lg">
                  Start Saving Today - 14 Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                * Calculations based on average customer data. Individual results may vary.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto text-center relative">
          <motion.div {...fadeInUp}>
            <Badge variant="secondary" className="mb-6">
              <Clock className="h-4 w-4 mr-1" />
              Limited Time: 14-Day Free Trial + Setup Consultation
            </Badge>
            
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
              Ready to <span className="text-primary">10x Your Efficiency?</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto">
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
                <Button size="lg" className="text-xl px-16 py-8 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  <Building className="mr-3 h-6 w-6" />
                  Start Your Transformation
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-xl px-12 py-8 border-2 hover:border-primary"
                onClick={() => {
                  // Scroll to features section
                  const featuresSection = document.getElementById('features');
                  if (featuresSection) {
                    featuresSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <Building className="mr-3 h-6 w-6" />
                Explore Platform
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
          </motion.div>
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
              <Button size="lg" className="mb-8">
                <BookOpen className="mr-2 h-5 w-5" />
                Explore All Articles
                <ArrowRight className="ml-2 h-5 w-5" />
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
                  <Badge variant="secondary" className="w-fit mb-2">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Trending
                  </Badge>
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
                  <Badge variant="secondary" className="w-fit mb-2">
                    <Users className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
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
                  <Badge variant="secondary" className="w-fit mb-2">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Money Saving
                  </Badge>
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

      {/* Enhanced Footer */}
      <footer className="border-t bg-card py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <Building className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">TenantFlow</span>
              </div>
              <p className="text-muted-foreground mb-4">
                The complete property management platform built for modern landlords.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>4.9/5 from 500+ reviews</span>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/lease-generator" className="hover:text-foreground transition-colors">Lease Generator</Link></li>
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Property Management Guide</Link></li>
                <li><Link to="/auth/signup" className="hover:text-foreground transition-colors">Free Trial</Link></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Help Center</Link></li>
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Getting Started Guide</Link></li>
                <li><Link to="/lease-generator/states" className="hover:text-foreground transition-colors">State Templates</Link></li>
                <li><Link to="/blog/property-management-software-comparison-2025" className="hover:text-foreground transition-colors">Legal Compliance Guide</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/blog" className="hover:text-foreground transition-colors">About Us</Link></li>
                <li>
                  <a 
                    href="mailto:support@tenantflow.app" 
                    className="hover:text-foreground transition-colors"
                  >
                    Contact Support
                  </a>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-muted-foreground mb-4 md:mb-0">
                © 2025 TenantFlow. All rights reserved.
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Built by</span>
                <a 
                  href="https://hudsondigitalsolutions.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Hudson Digital Solutions
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}