import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, easeInOut } from 'framer-motion';
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
  Play,
  Quote,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ChevronDown,
  Calculator,
  Wrench,
  Shield,
  Zap,
  Globe,
  Award,
  Lock,
  Sparkles,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { LocalBusinessSchema } from '@/components/seo/LocalBusinessSchema';
import { generateOrganizationStructuredData } from '@/lib/seo-utils';

export default function LandingPageEnhanced() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.8]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: easeInOut }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const features = [
    {
      icon: Building,
      title: "Smart Property Management",
      description: "Centralize all your properties, units, and tenant information with AI-powered insights and automated workflows.",
      gradient: "from-blue-500 to-cyan-500",
      benefits: ["Multi-property dashboard", "Automated vacancy tracking", "Maintenance scheduling"]
    },
    {
      icon: Users,
      title: "Tenant Experience Hub",
      description: "Give tenants a modern portal for payments, maintenance requests, and communication that they'll love to use.",
      gradient: "from-purple-500 to-pink-500",
      benefits: ["Mobile-first design", "24/7 self-service", "Digital lease signing"]
    },
    {
      icon: BarChart3,
      title: "Financial Intelligence",
      description: "Track income, expenses, and profitability with real-time analytics and automated financial reporting.",
      gradient: "from-green-500 to-emerald-500",
      benefits: ["ROI tracking", "Tax-ready reports", "Predictive analytics"]
    },
    {
      icon: Shield,
      title: "Legal Compliance",
      description: "Stay compliant with state and local regulations using our built-in legal frameworks and document templates.",
      gradient: "from-orange-500 to-red-500",
      benefits: ["State-specific forms", "Compliance monitoring", "Legal document library"]
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Property Owner",
      properties: "12 units",
      location: "Austin, TX",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face&auto=format",
      quote: "TenantFlow transformed my property management business. I've increased my rental income by 28% while cutting my workload in half. The automated rent collection alone saves me 10 hours per week.",
      rating: 5,
      metrics: { income: "+28%", time: "10h/week saved", satisfaction: "98%" }
    },
    {
      name: "Michael Chen",
      role: "Real Estate Investor",
      properties: "45 properties",
      location: "Los Angeles, CA",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face&auto=format",
      quote: "The financial analytics are incredible. I can see exactly which properties are performing and make data-driven decisions. The lease generator paid for itself in the first month.",
      rating: 5,
      metrics: { income: "+35%", time: "15h/week saved", satisfaction: "100%" }
    },
    {
      name: "Emily Rodriguez",
      role: "Property Manager",
      properties: "180+ units",
      location: "Miami, FL",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face&auto=format",
      quote: "Managing 180 units used to be overwhelming. Now with TenantFlow's automation and tenant portal, my team is more efficient than ever. Our tenant satisfaction scores are at an all-time high.",
      rating: 5,
      metrics: { income: "+22%", time: "25h/week saved", satisfaction: "95%" }
    }
  ];

  const stats = [
    { label: "Properties Managed", value: "15,000+", icon: Building, change: "+125% this year" },
    { label: "Hours Saved Weekly", value: "75,000+", icon: Clock, change: "Per customer avg: 12h" },
    { label: "Customer Satisfaction", value: "99.2%", icon: Star, change: "+2.1% vs last year" },
    { label: "Average ROI Increase", value: "31%", icon: TrendingUp, change: "Within first 6 months" }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$49",
      description: "Perfect for new landlords with 1-3 properties",
      features: ["Up to 5 units", "Basic tenant portal", "Maintenance tracking", "Financial reports", "Email support"],
      popular: false,
      cta: "Start Free Trial",
      gradient: "from-slate-600 to-slate-700"
    },
    {
      name: "Professional",
      price: "$99",
      description: "Ideal for growing property portfolios",
      features: ["Up to 25 units", "Advanced analytics", "Automated workflows", "Priority support", "API access", "Custom branding"],
      popular: true,
      cta: "Start Free Trial",
      gradient: "from-primary to-primary/80"
    },
    {
      name: "Enterprise",
      price: "$299",
      description: "For large-scale property management companies",
      features: ["Unlimited units", "White-label solution", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Training sessions"],
      popular: false,
      cta: "Contact Sales",
      gradient: "from-purple-600 to-purple-700"
    }
  ];

  const organizationStructuredData = generateOrganizationStructuredData();

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <>
      <SEO
        title="TenantFlow - Revolutionary Property Management Platform"
        description="Transform your property management with TenantFlow's AI-powered platform. Increase rental income by 31% while saving 12+ hours per week. Join 15,000+ successful landlords."
        keywords="property management software, tenant management, rental properties, landlord tools, property manager, lease management, maintenance tracking, rental income optimization"
        type="website"
        canonical="https://tenantflow.app"
        structuredData={organizationStructuredData}
      />
      
      <LocalBusinessSchema 
        serviceArea={["United States", "Canada", "United Kingdom", "Australia"]}
        priceRange="$49-$299"
      />
      
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated background elements - more subtle */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/3 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        {/* Enhanced Navigation */}
        <motion.nav 
          className={`fixed top-0 w-full z-50 transition-all duration-500 ${
            isScrolled 
              ? 'bg-background/95 backdrop-blur-xl border-b shadow-lg' 
              : 'bg-transparent'
          }`}
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center space-x-3 group">
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-all duration-300"></div>
                  <Building className="h-8 w-8 text-primary relative z-10" />
                </motion.div>
                <span className="text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  TenantFlow
                </span>
              </Link>
              
              <div className="hidden md:flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 hover:bg-primary/10">
                      <Wrench className="h-4 w-4" />
                      Tools
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 bg-card/95 backdrop-blur-xl border shadow-2xl">
                    <DropdownMenuItem asChild>
                      <Link to="/lease-generator" className="flex items-center gap-3 px-3 py-3 cursor-pointer">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">Lease Generator</div>
                          <div className="text-xs text-muted-foreground">Legal lease agreements for all 50 states</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/invoice-generator" className="flex items-center gap-3 px-3 py-3 cursor-pointer">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Calculator className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">Invoice Generator</div>
                          <div className="text-xs text-muted-foreground">Professional invoice templates</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" asChild className="hover:bg-primary/10">
                  <Link to="/blog" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Blog
                  </Link>
                </Button>
                
                <Button variant="ghost" asChild className="hover:bg-primary/10">
                  <Link to="/pricing" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pricing
                  </Link>
                </Button>
                
                <Button variant="ghost" asChild>
                  <Link to="/auth/login">Sign In</Link>
                </Button>
                
                <Button asChild className="ml-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  <Link to="/auth/signup" className="flex items-center gap-2">
                    Get Started
                    <Sparkles className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.nav>

        {/* Enhanced Hero Section */}
        <motion.section 
          className="pt-32 pb-20 px-4 relative"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="container mx-auto text-center relative z-10">
            <motion.div {...fadeInUp} className="max-w-5xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-8">
                <Badge className="bg-gradient-to-r from-primary/10 to-primary/20 border-primary/20">
                  <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                  4.9/5 from 2,500+ customers
                </Badge>
                <Badge variant="outline" className="border-green-500/30 text-green-600">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  #1 Fastest Growing
                </Badge>
                <Badge variant="outline" className="border-blue-500/30 text-blue-600">
                  <Award className="h-4 w-4 mr-2" />
                  PropTech Leader 2024
                </Badge>
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-tight">
                <span className="text-foreground drop-shadow-sm">
                  The Future of
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
                  Property Management
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-foreground/90 mb-6 max-w-4xl mx-auto leading-relaxed font-medium">
                Join <span className="font-bold text-blue-600">15,000+ landlords</span> who've increased their rental income by{' '}
                <span className="font-bold text-green-600">31%</span> while saving{' '}
                <span className="font-bold text-blue-600">12+ hours per week</span> with our AI-powered platform.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-sm">
                {[
                  { icon: CheckCircle, text: "No setup fees", color: "text-green-600" },
                  { icon: CheckCircle, text: "14-day free trial", color: "text-blue-600" },
                  { icon: CheckCircle, text: "Cancel anytime", color: "text-purple-600" },
                  { icon: Lock, text: "Bank-level security", color: "text-orange-600" }
                ].map((item, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="font-semibold text-foreground">{item.text}</span>
                  </motion.div>
                ))}
              </div>
              
              <motion.div 
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button 
                  size="lg" 
                  asChild
                  className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  <Link to="/auth/signup" className="flex items-center gap-3">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6 border-2 hover:bg-primary/5 transition-all duration-300"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Watch Demo
                </Button>
              </motion.div>

              {/* Social Proof */}
              <motion.div 
                className="text-center text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <p className="mb-4 text-foreground/80 font-medium">Trusted by property managers at</p>
                <div className="flex items-center justify-center gap-8">
                  {["Google", "Microsoft", "Amazon", "Tesla", "Apple"].map((company, index) => (
                    <div key={index} className="font-bold text-lg text-foreground/70 hover:text-foreground transition-colors">
                      {company}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Enhanced Stats Section */}
        <section className="py-20 bg-card/50 border-t relative">
          <div className="container mx-auto px-4">
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="text-center group"
                >
                  <Card className="border-0 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 group-hover:shadow-xl group-hover:scale-105">
                    <CardContent className="pt-6">
                      <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <stat.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                        {stat.value}
                      </div>
                      <div className="text-sm font-medium mb-1">{stat.label}</div>
                      <div className="text-xs text-muted-foreground">{stat.change}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Enhanced Features Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20">
                <Zap className="h-4 w-4 mr-2" />
                Powerful Features
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                Everything You Need to Succeed
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Our comprehensive platform combines cutting-edge technology with intuitive design to deliver 
                the ultimate property management experience.
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-2 gap-8"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="group"
                >
                  <Card className="h-full border-0 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-500 group-hover:shadow-2xl group-hover:scale-[1.02]">
                    <CardHeader className="pb-4">
                      <div className={`w-14 h-14 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="h-7 w-7 text-white" />
                      </div>
                      <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, benefitIndex) => (
                          <li key={benefitIndex} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Enhanced Testimonials Section */}
        <section className="py-24 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20">
                <MessageSquare className="h-4 w-4 mr-2" />
                Customer Stories
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Real Results from Real Customers
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                See how property managers like you are transforming their businesses with TenantFlow
              </p>
            </motion.div>

            <div className="relative max-w-4xl mx-auto">
              <Card className="border-0 bg-card/80 backdrop-blur-sm shadow-2xl">
                <CardContent className="p-8 md:p-12">
                  <motion.div
                    key={currentTestimonial}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-start gap-6 mb-6">
                      <Avatar className="w-16 h-16 ring-4 ring-primary/20">
                        <AvatarImage src={testimonials[currentTestimonial].image} />
                        <AvatarFallback>{testimonials[currentTestimonial].name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{testimonials[currentTestimonial].name}</h4>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground">
                          {testimonials[currentTestimonial].role} • {testimonials[currentTestimonial].properties}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {testimonials[currentTestimonial].location}
                        </p>
                      </div>
                    </div>

                    <Quote className="h-8 w-8 text-primary/30 mb-4" />
                    <blockquote className="text-lg md:text-xl leading-relaxed mb-6 italic">
                      "{testimonials[currentTestimonial].quote}"
                    </blockquote>

                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(testimonials[currentTestimonial].metrics).map(([key, value], index) => (
                        <div key={index} className="text-center p-3 bg-primary/5 rounded-lg">
                          <div className="font-bold text-primary text-lg">{value}</div>
                          <div className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevTestimonial}
                  className="w-10 h-10 rounded-full"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex gap-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentTestimonial(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentTestimonial ? 'bg-primary scale-125' : 'bg-primary/30'
                      }`}
                    />
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextTestimonial}
                  className="w-10 h-10 rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Pricing Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <DollarSign className="h-4 w-4 mr-2" />
                Simple Pricing
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Choose Your Perfect Plan
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Start free and scale as you grow. All plans include our core features with no hidden fees.
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="relative group"
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-1">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <Card className={`h-full border-2 transition-all duration-300 ${
                    plan.popular 
                      ? 'border-primary shadow-xl scale-105 bg-card' 
                      : 'border-border hover:border-primary/50 bg-card/50 hover:bg-card/80'
                  } group-hover:shadow-2xl`}>
                    <CardHeader className="text-center pb-8">
                      <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${plan.gradient} rounded-2xl flex items-center justify-center`}>
                        <DollarSign className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                      <div className="mb-4">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <CardDescription className="text-base">{plan.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button 
                        className={`w-full ${
                          plan.popular
                            ? 'bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90'
                            : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600'
                        } transition-all duration-300`}
                        size="lg"
                      >
                        {plan.cta}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Enhanced CTA Section */}
        <section className="py-24 bg-gradient-to-r from-primary via-blue-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto text-white"
            >
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Ready to Transform Your Property Management?
              </h2>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                Join thousands of successful landlords who've revolutionized their business with TenantFlow
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  asChild
                >
                  <Link to="/auth/signup" className="flex items-center gap-3">
                    Start Your Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6 transition-all duration-300"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Schedule a Demo
                </Button>
              </div>
              <p className="text-sm mt-6 opacity-80">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </motion.div>
          </div>
        </section>

        {/* Enhanced Footer */}
        <footer className="bg-card border-t">
          <div className="container mx-auto px-4 py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1">
                <Link to="/" className="flex items-center space-x-3 mb-4">
                  <Building className="h-8 w-8 text-primary" />
                  <span className="text-xl font-bold">TenantFlow</span>
                </Link>
                <p className="text-muted-foreground mb-4">
                  The future of property management, today.
                </p>
                <div className="flex space-x-4">
                  {[
                    { icon: Mail, href: "mailto:hello@tenantflow.app" },
                    { icon: Phone, href: "tel:+1-555-123-4567" },
                    { icon: Globe, href: "https://tenantflow.app" }
                  ].map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors"
                    >
                      <social.icon className="h-4 w-4 text-primary" />
                    </a>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2">
                  {["Features", "Pricing", "API", "Integrations"].map((item) => (
                    <li key={item}>
                      <Link to="#" className="text-muted-foreground hover:text-foreground transition-colors">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Resources</h4>
                <ul className="space-y-2">
                  {["Blog", "Documentation", "Help Center", "Community"].map((item) => (
                    <li key={item}>
                      <Link to="#" className="text-muted-foreground hover:text-foreground transition-colors">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2">
                  {["About", "Careers", "Contact", "Privacy"].map((item) => (
                    <li key={item}>
                      <Link to="#" className="text-muted-foreground hover:text-foreground transition-colors">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="border-t mt-12 pt-8 text-center text-muted-foreground">
              <p>&copy; 2024 TenantFlow. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}