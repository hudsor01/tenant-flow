import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Brain,
  Globe,
  ArrowRight,
  Play,
  Check,
  Star,
  TrendingUp,
  Shield,
  Users,
  Building2,
  Smartphone,
  Workflow,
  BarChart3,
  MessageSquare,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
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
              <div className="relative">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                  <Building2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                TenantFlow
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-8">
              <div className="flex items-center space-x-8">
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-foreground transition-all duration-200 font-medium relative group"
                >
                  Features
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
                </a>
                <a
                  href="#solutions"
                  className="text-muted-foreground hover:text-foreground transition-all duration-200 font-medium relative group"
                >
                  Solutions
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
                </a>
                <a
                  href="#pricing"
                  className="text-muted-foreground hover:text-foreground transition-all duration-200 font-medium relative group"
                >
                  Pricing
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
                </a>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-primary/10"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-primary/10 rounded-lg transition-colors duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          <div
            className={`lg:hidden transition-all duration-300 ease-in-out ${
              isMenuOpen
                ? "max-h-96 opacity-100 pb-6"
                : "max-h-0 opacity-0 overflow-hidden"
            }`}
          >
            <div className="space-y-4 pt-4 border-t border-border/40">
              <a
                href="#features"
                className="block py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#solutions"
                className="block py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Solutions
              </a>
              <a
                href="#pricing"
                className="block py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </a>
              <div className="pt-4 space-y-2">
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Start Free Trial
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Modern Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-secondary/3"></div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgb(142,76,36,0.03)_49%,rgb(142,76,36,0.03)_51%,transparent_52%)] bg-[length:20px_20px]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,rgb(142,76,36,0.05)_0%,transparent_25%),radial-gradient(circle_at_75%_75%,rgb(142,76,36,0.03)_0%,transparent_25%)]"></div>

        {/* Geometric Accent Elements */}
        <div className="absolute top-20 left-8 w-64 h-64 bg-gradient-to-r from-primary/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-8 w-96 h-96 bg-gradient-to-l from-secondary/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-transparent via-primary/2 to-transparent rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-6xl mx-auto">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center">
              <Badge
                variant="secondary"
                className="mb-8 text-primary border-primary/20 px-6 py-2 text-sm font-medium hover:bg-primary/10 transition-all duration-300 cursor-pointer"
              >
                <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                AI-Powered Property Intelligence
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Badge>
            </div>

            {/* Enhanced Headline */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-10 leading-[0.9]">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Simplify
              </span>
              <br />
              <span className="text-[#1e293b]">Property Management</span>
            </h1>

            {/* Enhanced Subtitle */}
            <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
              Transform your property business with AI-driven insights,
              automated workflows, and intelligent tenant experiences.{" "}
              <span className="text-primary font-semibold">
                Join 1000+ forward-thinking property managers.
              </span>
            </p>

            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Button
                size="lg"
                className="px-10 py-6 text-lg font-semibold bg-primary hover:bg-primary/90 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl group"
              >
                <Zap className="mr-3 h-6 w-6 group-hover:animate-pulse" />
                Start Free Trial
                <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-10 py-6 text-lg font-semibold border-2 hover:bg-primary/5 transform hover:scale-105 transition-all duration-300 group"
              >
                <Play className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            {/* Enhanced Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span className="font-medium">No setup fees</span>
              </div>
              <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span className="font-medium">14-day free trial</span>
              </div>
              <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span className="font-medium">Cancel anytime</span>
              </div>
              <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                <Shield className="h-5 w-5 text-primary mr-2" />
                <span className="font-medium">Enterprise security</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        </div>
      </section>

      {/* Enhanced Social Proof */}
      <section className="relative py-20 bg-secondary/30 border-y border-border/40 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_48%,rgb(142,76,36,0.02)_49%,rgb(142,76,36,0.02)_51%,transparent_52%)] bg-[length:60px_60px]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/2 to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <p className="text-muted-foreground font-medium text-lg">
              Trusted by industry leaders worldwide
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            {[
              { value: "1,000+", label: "Active Users", icon: Users },
              { value: "50,000+", label: "Properties", icon: Building2 },
              { value: "99.9%", label: "Uptime", icon: Shield },
              { value: "4.9★", label: "Rating", icon: Star },
            ].map((stat, index) => (
              <div
                key={index}
                className="text-center group cursor-pointer hover:scale-105 transition-transform duration-300"
              >
                <div className="flex justify-center mb-3">
                  <stat.icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/5 to-background"></div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <Badge
              variant="outline"
              className="mb-6 hover:bg-primary/10 transition-colors"
            >
              <Brain className="mr-2 h-4 w-4" />
              Smart Platform
            </Badge>
            <h2 className="text-4xl lg:text-6xl font-bold mb-8">
              Intelligent Property Operations
            </h2>
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto">
              Our AI-powered platform automates complex workflows and provides
              actionable insights to maximize your property performance.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "AI-Powered Analytics",
                description:
                  "Get predictive insights on rent optimization, maintenance needs, and tenant satisfaction with our advanced ML algorithms.",
                features: [
                  "Rent optimization suggestions",
                  "Predictive maintenance alerts",
                  "Tenant behavior analysis",
                ],
              },
              {
                icon: Workflow,
                title: "Automated Workflows",
                description:
                  "Streamline operations with intelligent automation for leasing, maintenance, and tenant communications.",
                features: [
                  "Smart lease renewals",
                  "Auto maintenance scheduling",
                  "Intelligent notifications",
                ],
              },
              {
                icon: Smartphone,
                title: "Mobile-First Experience",
                description:
                  "Manage properties on-the-go with our intuitive mobile app designed for modern property managers.",
                features: [
                  "Native mobile apps",
                  "Offline functionality",
                  "Real-time sync",
                ],
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-2xl transition-all duration-500 border-2 hover:border-primary/20 relative overflow-hidden cursor-pointer transform hover:-translate-y-2 backdrop-blur-sm bg-background/80 hover:bg-background/90"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative pb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                    <feature.icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-2xl mb-4 group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-4">
                    {feature.features.map((item, idx) => (
                      <div key={idx} className="flex items-center text-sm">
                        <div className="w-3 h-3 bg-primary rounded-full mr-4 group-hover:animate-pulse"></div>
                        <span className="group-hover:text-foreground transition-colors">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    className="mt-6 p-0 h-auto text-primary hover:text-primary/80 group-hover:translate-x-2 transition-transform"
                  >
                    Learn more
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Solutions Section */}
      <section
        id="solutions"
        className="relative py-24 bg-secondary/20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-secondary/3"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgb(142,76,36,0.08)_0%,transparent_40%)]"></div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/5 to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Badge
                variant="outline"
                className="mb-6 hover:bg-primary/10 transition-colors"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Performance
              </Badge>
              <h2 className="text-4xl lg:text-5xl font-bold mb-8">
                Maximize Property ROI with Data-Driven Decisions
              </h2>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                Our advanced analytics engine processes thousands of data points
                to help you make informed decisions that increase profitability
                and tenant satisfaction.
              </p>
              <div className="space-y-6">
                {[
                  {
                    title: "Dynamic Pricing",
                    description:
                      "AI-powered rent optimization based on market conditions",
                  },
                  {
                    title: "Predictive Analytics",
                    description: "Forecast maintenance needs and market trends",
                  },
                  {
                    title: "Performance Benchmarks",
                    description:
                      "Compare against market standards and competitors",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-4 group cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mt-1 group-hover:bg-primary/30 transition-colors">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-muted-foreground group-hover:text-foreground transition-colors">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                className="mt-10 px-8 bg-primary hover:bg-primary/90 transform hover:scale-105 transition-all duration-300"
              >
                Explore Features
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="order-1 lg:order-2 relative">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-12 h-96 flex items-center justify-center group hover:scale-105 transition-transform duration-500 cursor-pointer">
                <BarChart3 className="h-40 w-40 text-primary/60 group-hover:text-primary/80 transition-colors group-hover:scale-110 transform duration-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section */}
      <section id="pricing" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/10 via-background to-secondary/10"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgb(142,76,36,0.03)_90deg,transparent_180deg,rgb(142,76,36,0.03)_270deg,transparent_360deg)]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/3 to-transparent rounded-full blur-3xl"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <Badge
              variant="outline"
              className="mb-6 hover:bg-primary/10 transition-colors"
            >
              Pricing
            </Badge>
            <h2 className="text-4xl lg:text-6xl font-bold mb-8">
              Choose Your Growth Plan
            </h2>
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Flexible pricing that scales with your portfolio. Start free and
              upgrade as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$0",
                period: "/month",
                description: "Perfect for small portfolios",
                limit: "Up to 5 properties",
                features: [
                  "Basic property management",
                  "Tenant portal",
                  "Email support",
                  "Mobile app access",
                ],
                cta: "Get Started Free",
                popular: false,
              },
              {
                name: "Professional",
                price: "$49",
                period: "/month",
                description: "For growing businesses",
                limit: "Up to 25 properties",
                features: [
                  "Everything in Starter",
                  "AI analytics & insights",
                  "Automated workflows",
                  "Priority support",
                  "Advanced reporting",
                ],
                cta: "Start Free Trial",
                popular: true,
              },
              {
                name: "Enterprise",
                price: "$149",
                period: "/month",
                description: "For large operations",
                limit: "Unlimited properties",
                features: [
                  "Everything in Professional",
                  "Custom integrations",
                  "Dedicated support",
                  "White-label options",
                  "SLA guarantee",
                ],
                cta: "Contact Sales",
                popular: false,
              },
            ].map((plan, index) => (
              <Card
                key={index}
                className={`relative border-2 transition-all duration-500 cursor-pointer transform hover:-translate-y-4 hover:shadow-2xl backdrop-blur-sm ${
                  plan.popular
                    ? "border-primary shadow-xl scale-105 bg-gradient-to-b from-primary/8 to-background/90"
                    : "hover:border-primary/20 bg-background/80 hover:bg-background/90"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-base mb-6">
                    {plan.description}
                  </CardDescription>
                  <div className="mb-2">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-lg text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.limit}</p>
                </CardHeader>
                <CardContent>
                  <Button
                    className={`w-full mb-8 py-6 text-base font-semibold transform hover:scale-105 transition-all duration-300 ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90 shadow-lg"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                    {plan.cta.includes("Free") && (
                      <Zap className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center group">
                        <Check className="h-5 w-5 text-primary mr-4 group-hover:scale-110 transition-transform" />
                        <span className="text-sm group-hover:text-foreground transition-colors">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compact Minimal Footer */}
      <footer className="relative py-12 bg-secondary/30 border-t border-border/40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/2 to-transparent"></div>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_48%,rgb(142,76,36,0.02)_49%,rgb(142,76,36,0.02)_51%,transparent_52%)] bg-[length:40px_40px]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">TenantFlow</span>
            </div>

            <div className="flex flex-wrap items-center justify-center space-x-8 text-sm text-muted-foreground">
              <a
                href="#"
                className="hover:text-foreground transition-colors duration-200"
              >
                Privacy
              </a>
              <a
                href="#"
                className="hover:text-foreground transition-colors duration-200"
              >
                Terms
              </a>
              <a
                href="#"
                className="hover:text-foreground transition-colors duration-200"
              >
                Security
              </a>
              <a
                href="#"
                className="hover:text-foreground transition-colors duration-200"
              >
                Contact
              </a>
            </div>

            <div className="flex space-x-3">
              <Button
                size="sm"
                variant="outline"
                className="hover:bg-primary/10 transition-colors duration-200"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="hover:bg-primary/10 transition-colors duration-200"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border-t border-border/40 mt-8 pt-6 text-center text-sm text-muted-foreground">
            © 2024 TenantFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}