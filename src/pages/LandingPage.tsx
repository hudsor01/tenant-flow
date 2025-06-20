import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// CardContent not currently used
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  // CheckCircle, // Not currently used 
  Star,
  Users,
  Clock,
  Shield,
  ArrowRight,
  Building,
  DollarSign,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">TenantFlow</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link to="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth/signup">
                <Button>Get Started Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div {...fadeInUp}>
            <Badge variant="secondary" className="mb-4">
              <Star className="h-4 w-4 mr-1" />
              Free Lease Generator Available
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Professional Property
              <br />
              <span className="text-primary">Management Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Manage your rental properties with ease. Track tenants, collect payments, 
              and generate professional lease agreements in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/lease-generator">
                <Button size="lg" className="text-lg px-8">
                  <FileText className="mr-2 h-5 w-5" />
                  Generate Free Lease
                </Button>
              </Link>
              <Link to="/auth/signup">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  <Building className="mr-2 h-5 w-5" />
                  Start Managing Properties
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • Generate 1 lease free • Full platform trial available
            </p>
          </motion.div>
        </div>
      </section>

      {/* Lease Generator CTA */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto">
          <motion.div 
            {...fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Need a Lease Agreement Right Now?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Generate a professional, legally-compliant lease agreement in under 5 minutes
            </p>
          </motion.div>

          <motion.div 
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>5-Minute Setup</CardTitle>
                  <CardDescription>
                    Fill out our simple form with property and tenant details
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Legally Compliant</CardTitle>
                  <CardDescription>
                    Generated with standard terms and legal protections
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Instant Download</CardTitle>
                  <CardDescription>
                    Get PDF or Word format ready for signing immediately
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div {...fadeInUp} className="text-center">
            <Link to="/lease-generator">
              <Button size="lg" className="text-lg px-12">
                Generate Your Free Lease Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              First lease is completely free • No signup required
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div 
            {...fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Manage Properties
            </h2>
            <p className="text-xl text-muted-foreground">
              From tenant screening to rent collection, we've got you covered
            </p>
          </motion.div>

          <motion.div 
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <motion.div variants={fadeInUp}>
              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Tenant Management</CardTitle>
                  <CardDescription>
                    Track tenant information, lease dates, and communication history
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <CardHeader>
                  <DollarSign className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Payment Tracking</CardTitle>
                  <CardDescription>
                    Monitor rent payments, late fees, and generate financial reports
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <CardHeader>
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Document Storage</CardTitle>
                  <CardDescription>
                    Store leases, photos, and important documents securely in the cloud
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <CardHeader>
                  <Building className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Property Portfolio</CardTitle>
                  <CardDescription>
                    Manage multiple properties and units from a single dashboard
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <CardHeader>
                  <Zap className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Maintenance Requests</CardTitle>
                  <CardDescription>
                    Track and manage property maintenance with tenant communication
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Secure & Compliant</CardTitle>
                  <CardDescription>
                    Bank-level security with automated compliance features
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Simplify Property Management?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of landlords who trust TenantFlow to manage their rental properties efficiently.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/signup">
                <Button size="lg" className="text-lg px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/lease-generator">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Generate Free Lease
                  <FileText className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Building className="h-6 w-6 text-primary" />
              <span className="font-semibold">TenantFlow</span>
            </div>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacy Policy</a>
              <a href="#" className="hover:text-foreground">Terms of Service</a>
              <a href="#" className="hover:text-foreground">Contact</a>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-4">
            © 2025 TenantFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}