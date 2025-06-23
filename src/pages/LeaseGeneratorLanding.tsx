import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Star,
  Clock,
  Shield,
  ArrowRight,
  Building,
  DollarSign,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LeaseGeneratorLanding() {
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
            <Link to="/" className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">TenantFlow</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost">Home</Button>
              </Link>
              <Link to="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link to="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth/signup">
                <Button>Get Started</Button>
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
              100% Free • No Signup Required
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Professional Lease
              <br />
              <span className="text-primary">Generator</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create legally-compliant residential lease agreements in minutes. 
              Professional templates, instant download, completely free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/lease-generator/create">
                <Button size="lg" className="text-lg px-8">
                  <FileText className="mr-2 h-5 w-5" />
                  Generate Free Lease Now
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  <Building className="mr-2 h-5 w-5" />
                  Full Property Management
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              First lease completely free • PDF & Word formats • Legally compliant templates
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto">
          <motion.div 
            {...fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Generate Your Lease in 3 Simple Steps
            </h2>
            <p className="text-xl text-muted-foreground">
              No legal knowledge required • Professional results guaranteed
            </p>
          </motion.div>

          <motion.div 
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 mb-12"
          >
            <motion.div variants={fadeInUp} className="text-center">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Fill Out Form</h3>
              <p className="text-muted-foreground">
                Enter property details, tenant information, and lease terms using our guided form
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Review & Customize</h3>
              <p className="text-muted-foreground">
                Preview your lease with standard legal clauses and make any necessary adjustments
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Download & Sign</h3>
              <p className="text-muted-foreground">
                Instantly download your professional lease in PDF or Word format, ready for signing
              </p>
            </motion.div>
          </motion.div>

          <motion.div {...fadeInUp} className="text-center">
            <Link to="/lease-generator/create">
              <Button size="lg" className="text-lg px-12">
                Start Creating Your Lease
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
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
              Professional Lease Templates
            </h2>
            <p className="text-xl text-muted-foreground">
              Built by legal experts, trusted by thousands of landlords
            </p>
          </motion.div>

          <motion.div 
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardHeader>
                  <Shield className="h-8 w-8 text-primary mb-2 mx-auto" />
                  <CardTitle>Legally Compliant</CardTitle>
                  <CardDescription>
                    Standard clauses and legal protections included automatically
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardHeader>
                  <Clock className="h-8 w-8 text-primary mb-2 mx-auto" />
                  <CardTitle>5-Minute Setup</CardTitle>
                  <CardDescription>
                    Quick guided form gets you a complete lease in minutes
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardHeader>
                  <Download className="h-8 w-8 text-primary mb-2 mx-auto" />
                  <CardTitle>Multiple Formats</CardTitle>
                  <CardDescription>
                    Download as PDF for signing or Word for customization
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardHeader>
                  <DollarSign className="h-8 w-8 text-primary mb-2 mx-auto" />
                  <CardTitle>Completely Free</CardTitle>
                  <CardDescription>
                    First lease is free, no hidden fees or signup required
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials/Social Proof */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto">
          <motion.div 
            {...fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Property Owners
            </h2>
            <div className="flex items-center justify-center gap-8 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>10,000+ Leases Generated</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <span>4.9/5 Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Legal Expert Approved</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Create Your Professional Lease?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of landlords who've created professional lease agreements with our free generator.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/lease-generator/create">
                <Button size="lg" className="text-lg px-8">
                  Generate Free Lease
                  <FileText className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Full Property Management Platform
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Need to manage multiple properties? Check out our full platform with tenant management, payment tracking, and more.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}