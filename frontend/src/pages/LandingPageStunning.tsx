import { useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
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
  Clock,
  BarChart3,
  Sparkles,
  Zap,
  Trophy,
  PlayCircle,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';

export default function LandingPageStunning() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 800], [0, -400]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.8]);

  return (
    <>
      <SEO 
        title="TenantFlow - Revolutionary Property Management Platform"
        description="Transform your property management with AI-powered automation, stunning tenant portals, and real-time analytics."
        keywords="property management, landlord software, tenant management, lease management, real estate"
        canonical="https://tenantflow.app"
      />
      
      {/* Fixed Navigation */}
      <motion.nav 
        className="fixed top-0 w-full z-50 bg-black/10 backdrop-blur-2xl border-b border-white/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl blur-lg opacity-60"></div>
                <Building className="h-10 w-10 text-white relative z-10 p-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                TenantFlow
              </span>
            </motion.div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {['Features', 'Pricing', 'Blog'].map((item, index) => (
                <motion.a
                  key={item}
                  href={`/${item.toLowerCase()}`}
                  className="text-white/80 hover:text-white transition-all duration-300 font-medium"
                  whileHover={{ y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                >
                  {item}
                </motion.a>
              ))}
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="flex items-center space-x-4"
              >
                <Link to="/auth/login" className="text-white/80 hover:text-white transition-colors font-medium">
                  Sign In
                </Link>
                <Button 
                  asChild
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Link to="/auth/signup">Get Started</Link>
                </Button>
              </motion.div>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-black/20 backdrop-blur-xl border-t border-white/10"
            >
              <div className="container mx-auto px-6 py-4 space-y-4">
                {['Features', 'Pricing', 'Blog'].map((item) => (
                  <a key={item} href={`/${item.toLowerCase()}`} className="block text-white/80 hover:text-white transition-colors">
                    {item}
                  </a>
                ))}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <Link to="/auth/login" className="block text-white/80 hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <Link to="/auth/signup">Get Started</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section with Animated Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
          style={{ y: backgroundY }}
        >
          {/* Floating Orbs */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        </motion.div>

        <motion.div 
          className="relative z-10 container mx-auto px-6 text-center"
          style={{ opacity: heroOpacity, scale }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 text-blue-200 px-6 py-2 text-sm font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Property Management Revolution
            </Badge>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            className="text-6xl md:text-8xl lg:text-9xl font-bold mb-8 leading-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              Transform
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Property
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Management
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            className="text-xl md:text-2xl text-blue-100/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            Experience the future of property management with our AI-powered platform. 
            Stunning interfaces, intelligent automation, and delighted tenants.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <Button 
              size="lg" 
              asChild
              className="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-12 py-6 text-xl rounded-full font-bold shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 transition-all duration-300"
            >
              <Link to="/auth/signup" className="flex items-center gap-3">
                Start Free Trial
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="group border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 px-12 py-6 text-xl rounded-full font-bold transition-all duration-300"
            >
              <PlayCircle className="h-6 w-6 mr-3 group-hover:scale-110 transition-transform" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div 
            className="flex flex-wrap justify-center gap-8 text-blue-200/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            {[
              { icon: CheckCircle, text: "14-day free trial" },
              { icon: Shield, text: "Bank-level security" },
              { icon: Clock, text: "24/7 support" },
              { icon: Trophy, text: "Award winning" }
            ].map((item, index) => (
              <motion.div 
                key={index}
                className="flex items-center gap-2"
                whileHover={{ y: -2, color: "#60a5fa" }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center text-white/40"
            >
              <span className="text-sm mb-2">Scroll to explore</span>
              <ChevronDown className="h-6 w-6" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Floating Stats */}
      <section className="relative py-32 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-6">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {[
              { number: "50K+", label: "Properties", icon: Building, gradient: "from-blue-400 to-cyan-400" },
              { number: "99.9%", label: "Uptime", icon: Zap, gradient: "from-green-400 to-emerald-400" },
              { number: "24/7", label: "Support", icon: Clock, gradient: "from-purple-400 to-pink-400" },
              { number: "4.9★", label: "Rating", icon: Star, gradient: "from-yellow-400 to-orange-400" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-center group cursor-pointer"
              >
                <div className="relative mb-4">
                  <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity`}></div>
                  <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <stat.icon className={`h-8 w-8 mx-auto mb-4 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`} />
                    <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2`}>
                      {stat.number}
                    </div>
                    <div className="text-white/60 font-medium">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="relative py-32 bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:6rem_6rem]"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Stunning Features
              </span>
            </h2>
            <p className="text-xl text-blue-100/70 max-w-3xl mx-auto">
              Every pixel crafted for perfection. Every interaction designed for delight.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              {
                icon: Building,
                title: "Smart Portfolios",
                description: "Beautiful dashboards that make managing hundreds of properties feel effortless",
                gradient: "from-blue-500 to-cyan-500",
                delay: 0
              },
              {
                icon: Users,
                title: "Tenant Delight",
                description: "Gorgeous tenant portals that your renters will actually love using",
                gradient: "from-purple-500 to-pink-500",
                delay: 0.2
              },
              {
                icon: BarChart3,
                title: "Visual Analytics",
                description: "Stunning charts and insights that turn complex data into beautiful stories",
                gradient: "from-green-500 to-emerald-500",
                delay: 0.4
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: feature.delay }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
                className="group cursor-pointer"
              >
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  <CardHeader className="relative z-10">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} p-4 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white group-hover:text-blue-200 transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-blue-100/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(-45deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
              Ready to Experience
              <br />
              <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                The Future?
              </span>
            </h2>
            
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
              Join thousands of property managers who've discovered the most beautiful way to manage real estate.
            </p>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg" 
                asChild
                className="bg-white text-purple-600 hover:bg-white/90 px-12 py-6 text-xl rounded-full font-bold shadow-2xl hover:shadow-white/25 transform transition-all duration-300"
              >
                <Link to="/auth/signup" className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6" />
                  Start Your Journey
                  <ArrowRight className="h-6 w-6" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-white/10 py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <Building className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                TenantFlow
              </span>
            </div>
            
            <div className="flex space-x-8 text-white/60">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-white/40">
            <p>&copy; 2024 TenantFlow. Crafted with ✨ for beautiful property management.</p>
          </div>
        </div>
      </footer>
    </>
  );
}