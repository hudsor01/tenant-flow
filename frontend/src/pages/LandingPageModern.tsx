import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users, 
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  Clock,
  FileText,
  Calculator,
  Award,
  ChevronRight,
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';

export default function LandingPageModern() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <>
      <SEO 
        title="TenantFlow - Modern Property Management Platform"
        description="Professional property management software built for scale. Streamline operations, increase efficiency, and grow your portfolio."
        keywords="property management software, landlord platform, tenant management, real estate operations"
        canonical="https://tenantflow.app"
      />

      {/* Compact Navigation */}
      <motion.header 
        className="fixed top-0 w-full z-50 transition-all duration-300"
        style={{ 
          backgroundColor: scrollY > 20 ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
          backdropFilter: scrollY > 20 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 20 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'
        }}
      >
        <nav className="container mx-auto px-8 py-3">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div className="relative w-8 h-8">
                {/* Flowing gradient representing your logo */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-teal-400 to-blue-500 rounded-lg opacity-90"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building className="w-4 h-4 text-white relative z-10" />
                </div>
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">TENANT FLOW</span>
            </motion.div>
            
            <div className="hidden md:flex items-center space-x-6">
              {['Features', 'Pricing', 'Resources'].map((item) => (
                <motion.div key={item} whileHover={{ y: -0.5 }} transition={{ type: "spring", stiffness: 400 }}>
                  <Link to={`/${item.toLowerCase()}`} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    {item}
                  </Link>
                </motion.div>
              ))}
              
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" asChild className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                  <Link to="/auth/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 h-8 shadow-sm">
                  <Link to="/auth/signup">Get started</Link>
                </Button>
              </div>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 bg-gradient-to-b from-blue-50/50 to-white overflow-hidden">
        <div className="container mx-auto px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div {...fadeInUp}>
              <Badge variant="secondary" className="mb-8 bg-blue-100/80 text-blue-700 border-0 px-4 py-2 text-sm font-medium">
                <Award className="w-4 h-4 mr-2" />
                Trusted by 15,000+ property managers
              </Badge>
            </motion.div>

            <motion.h1 
              className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-[0.9] tracking-tight"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span className="bg-gradient-to-r from-orange-500 via-teal-500 to-blue-600 bg-clip-text text-transparent block">
                Simplify
              </span>
              <span className="text-gray-900 block">Property Management</span>
            </motion.h1>

            <motion.p 
              className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Scale your operations with professional-grade tools designed for modern property managers.
              Streamline workflows, increase efficiency, and focus on what matters most.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.div 
                whileHover={{ 
                  scale: 1.02, 
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                  y: -2 
                }} 
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <Button size="lg" asChild className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 hover:from-gray-800 hover:via-gray-700 hover:to-gray-800 text-white px-12 h-16 text-lg font-bold shadow-2xl border-0 rounded-2xl overflow-hidden group">
                  <Link to="/auth/signup" className="flex items-center gap-3 relative z-10">
                    <span>Start free trial</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 via-teal-400/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Link>
                </Button>
              </motion.div>
              
              <motion.div 
                whileHover={{ 
                  scale: 1.02,
                  y: -2,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
                }} 
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <Button size="lg" variant="outline" className="border-2 border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 px-12 h-16 text-lg font-bold rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <Play className="w-5 h-5 mr-3" />
                  <span>Watch demo</span>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex flex-wrap justify-center gap-8 text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {[
                { icon: CheckCircle, text: "14-day free trial" },
                { icon: Shield, text: "SOC 2 compliant" },
                { icon: Clock, text: "24/7 support" }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  className="flex items-center gap-2"
                  whileHover={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <item.icon className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-8">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-12"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
          >
            {[
              { number: "15K+", label: "Properties", sublabel: "Under management" },
              { number: "31%", label: "ROI increase", sublabel: "Average across users" },
              { number: "12h", label: "Time saved", sublabel: "Per week per manager" },
              { number: "99.2%", label: "Uptime", sublabel: "Last 12 months" }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                className="text-center"
                variants={fadeInUp}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">{stat.label}</div>
                <div className="text-sm text-gray-500">{stat.sublabel}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-gradient-to-b from-white to-gray-50/50">
        <div className="container mx-auto px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Built for scale
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Everything you need to manage properties efficiently, from single units to large portfolios.
            </p>
          </motion.div>

          <motion.div 
            className="grid lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
          >
            {[
              {
                icon: Building,
                title: "Portfolio management",
                description: "Centralized dashboard for all your properties with advanced filtering, custom fields, and bulk operations.",
                color: "blue"
              },
              {
                icon: Users,
                title: "Tenant experience",
                description: "Modern tenant portal with online payments, maintenance requests, and document sharing capabilities.",
                color: "green"
              },
              {
                icon: BarChart3,
                title: "Financial analytics",
                description: "Real-time insights into performance, automated reporting, and tax-ready financial statements.",
                color: "purple"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className="p-8 border-0 shadow-sm hover:shadow-md transition-all duration-300 h-full bg-white">
                  <div className={`w-12 h-12 rounded-xl bg-${feature.color}-100 flex items-center justify-center mb-6`}>
                    <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">{feature.description}</p>
                  <motion.div 
                    className="flex items-center text-gray-900 font-medium group cursor-pointer"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    Learn more
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-8">
          <motion.div 
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Professional tools included
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Get access to our complete suite of professional tools at no additional cost.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: FileText,
                  title: "Lease Generator",
                  description: "State-compliant lease agreements for all 50 states",
                  badge: "50 states"
                },
                {
                  icon: Calculator,
                  title: "Invoice Generator", 
                  description: "Professional invoices and billing templates",
                  badge: "Templates"
                }
              ].map((tool, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Card className="p-6 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <tool.icon className="w-5 h-5 text-gray-700" />
                      </div>
                      <Badge variant="secondary" className="text-xs font-medium">
                        {tool.badge}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{tool.title}</h3>
                    <p className="text-gray-600 text-sm">{tool.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-32 bg-gray-50/50">
        <div className="container mx-auto px-8">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="flex justify-center mb-8">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
              ))}
            </div>
            
            <blockquote className="text-3xl md:text-4xl font-medium text-gray-900 mb-12 leading-tight">
              "TenantFlow eliminated the chaos from our operations. We manage 200+ units more efficiently 
              than we used to manage 50."
            </blockquote>
            
            <div className="flex items-center justify-center">
              <div>
                <div className="font-semibold text-gray-900 text-lg">Sarah Chen</div>
                <div className="text-gray-600">VP Operations, Metro Properties</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gray-900">
        <div className="container mx-auto px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
              Ready to scale
              <span className="text-blue-400 block">your operations?</span>
            </h2>
            
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join thousands of property managers who've transformed their business with TenantFlow.
            </p>
            
            <motion.div 
              whileHover={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(255, 255, 255, 0.25)" }} 
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <Button size="lg" asChild className="bg-white hover:bg-gray-50 text-gray-900 px-12 h-16 text-xl font-bold shadow-xl border-0 rounded-2xl">
                <Link to="/auth/signup" className="flex items-center gap-4">
                  Start free trial
                  <ArrowRight className="w-6 h-6" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 bg-white border-t border-gray-200">
        <div className="container mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="relative w-7 h-7">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-teal-400 to-blue-500 rounded-md opacity-90"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building className="w-4 h-4 text-white relative z-10" />
                </div>
              </div>
              <span className="font-bold text-gray-900 tracking-tight">TENANT FLOW</span>
            </div>
            
            <div className="flex items-center space-x-8 text-sm text-gray-600">
              <Link to="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
              <span>&copy; 2024</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}