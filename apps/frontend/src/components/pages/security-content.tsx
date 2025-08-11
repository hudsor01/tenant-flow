'use client'

import React, { Suspense } from 'react'
import { motion } from '@/lib/framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Shield, 
  Lock, 
  Eye, 
  Server, 
  FileCheck, 
  Globe, 
  CheckCircle,
  Download,
  ExternalLink,
  Clock,
  AlertTriangle,
  Database,
  Key,
  Fingerprint,
  Cloud
} from 'lucide-react'
import Link from 'next/link'

// Server Component for certifications
function ComplianceCertifications() {
  const certifications = [
    {
      title: 'SOC 2 Type II',
      description: 'Security, availability, and confidentiality controls',
      status: 'Certified',
      icon: Shield,
      validUntil: '2025'
    },
    {
      title: 'GDPR Compliant',
      description: 'European data protection regulation compliance',
      status: 'Compliant',
      icon: Globe,
      validUntil: 'Ongoing'
    },
    {
      title: 'CCPA Compliant',
      description: 'California consumer privacy act compliance',
      status: 'Compliant',
      icon: FileCheck,
      validUntil: 'Ongoing'
    },
    {
      title: 'ISO 27001',
      description: 'Information security management system',
      status: 'In Progress',
      icon: Lock,
      validUntil: '2025'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {certifications.map((cert) => {
        const IconComponent = cert.icon
        return (
          <Card key={cert.title} className="border-0 bg-gradient-to-br from-white to-success/5 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <IconComponent className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{cert.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{cert.description}</p>
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-xs text-success font-medium">{cert.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Valid: {cert.validUntil}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Client Component for interactive security features
function SecurityFeatures() {
  const features = [
    {
      category: 'Data Protection',
      icon: Database,
      items: [
        'AES-256 encryption at rest',
        'TLS 1.3 encryption in transit',
        'End-to-end encrypted backups',
        'Zero-knowledge architecture'
      ]
    },
    {
      category: 'Access Control',
      icon: Key,
      items: [
        'Multi-factor authentication (MFA)',
        'Role-based access control (RBAC)',
        'Single sign-on (SSO) integration',
        'Session timeout controls'
      ]
    },
    {
      category: 'Infrastructure',
      icon: Server,
      items: [
        'AWS security best practices',
        'Network isolation & VPCs',
        'DDoS protection',
        'Regular security patching'
      ]
    },
    {
      category: 'Monitoring',
      icon: Eye,
      items: [
        '24/7 security monitoring',
        'Intrusion detection systems',
        'Audit logs & activity tracking',
        'Real-time threat detection'
      ]
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {features.map((feature, index) => {
        const IconComponent = feature.icon
        return (
          <motion.div
            key={feature.category}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <Card className="border-0 bg-gradient-to-br from-white to-primary/5 hover:shadow-lg transition-all duration-300 h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-xl text-foreground">{feature.category}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feature.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

export function SecurityContent() {
  const trustSignals = [
    {
      metric: '99.9%',
      label: 'Uptime SLA',
      description: 'Guaranteed availability'
    },
    {
      metric: '< 5min',
      label: 'Response Time',
      description: 'Security incident response'
    },
    {
      metric: '0',
      label: 'Data Breaches',
      description: 'Since inception'
    },
    {
      metric: '24/7',
      label: 'Monitoring',
      description: 'Continuous security watch'
    }
  ]

  const securityPolicies = [
    {
      title: 'Privacy Policy',
      description: 'How we collect, use, and protect your data',
      lastUpdated: 'Updated Jan 2025',
      href: '/privacy-policy'
    },
    {
      title: 'Terms of Service',
      description: 'Legal terms governing our service usage',
      lastUpdated: 'Updated Jan 2025',
      href: '/terms-of-service'
    },
    {
      title: 'Data Processing Agreement',
      description: 'GDPR-compliant data processing terms',
      lastUpdated: 'Updated Dec 2024',
      href: '/dpa'
    },
    {
      title: 'Security Whitepaper',
      description: 'Detailed technical security documentation',
      lastUpdated: 'Updated Nov 2024',
      href: '/security-whitepaper.pdf'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <Badge className="bg-gradient-to-r from-success via-primary to-accent text-white border-0 px-6 py-2 text-sm font-semibold shadow-lg">
                <Shield className="w-4 h-4 mr-2" />
                Enterprise Security
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            >
              Security &{' '}
              <span className="bg-gradient-to-r from-success via-primary to-accent bg-clip-text text-transparent">
                Compliance
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              Your data deserves the highest level of protection. We implement enterprise-grade security 
              measures and maintain strict compliance standards to keep your information safe.
            </motion.p>
          </div>

          {/* Trust Signals */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          >
            {trustSignals.map((signal) => (
              <Card key={signal.label} className="border-0 bg-gradient-to-br from-white to-success/5 text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-success mb-2">{signal.metric}</div>
                  <div className="text-sm font-semibold text-foreground mb-1">{signal.label}</div>
                  <div className="text-xs text-muted-foreground">{signal.description}</div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Compliance Certifications */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Compliance Certifications</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We maintain the highest standards of compliance with industry regulations and best practices.
              </p>
            </div>
            <Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-lg" />}>
              <ComplianceCertifications />
            </Suspense>
          </motion.div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 px-4 bg-gradient-to-r from-muted/20 to-muted/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-foreground mb-6">Security Architecture</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our multi-layered security approach protects your data at every level, from infrastructure 
              to application and user access.
            </p>
          </motion.div>

          <SecurityFeatures />
        </div>
      </section>

      {/* Data Protection Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-foreground mb-6">Data Protection Promise</h2>
            <p className="text-xl text-muted-foreground">
              We're committed to protecting your privacy and maintaining the confidentiality of your data.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="border-0 bg-gradient-to-br from-white to-primary/5 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                      <Fingerprint className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">Your Data, Your Control</h3>
                  </div>
                  <ul className="space-y-4 text-muted-foreground">
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>You own your data - we're just the custodians</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Export your data anytime in standard formats</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Request deletion and we'll comply within 30 days</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Transparent data usage with clear consent</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="border-0 bg-gradient-to-br from-white to-accent/5 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-accent to-success rounded-full flex items-center justify-center">
                      <Cloud className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">Secure Infrastructure</h3>
                  </div>
                  <ul className="space-y-4 text-muted-foreground">
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>AWS infrastructure with SOC 2 compliance</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Automated daily backups with encryption</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Disaster recovery with 4-hour RTO</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Regular penetration testing & vulnerability scans</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Policies */}
      <section className="py-16 px-4 bg-gradient-to-r from-muted/20 to-muted/10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-foreground mb-6">Legal & Compliance Documents</h2>
            <p className="text-xl text-muted-foreground">
              Access our comprehensive legal documentation and security policies.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {securityPolicies.map((policy, policyIndex) => (
              <motion.div
                key={policy.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: policyIndex * 0.1 }}
                viewport={{ once: true }}
              >
                <Link 
                  href={policy.href}
                  target={policy.href.endsWith('.pdf') ? '_blank' : undefined}
                  rel={policy.href.endsWith('.pdf') ? 'noopener noreferrer' : undefined}
                >
                  <Card className="border-0 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {policy.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">{policy.description}</p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{policy.lastUpdated}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {policy.href.endsWith('.pdf') ? (
                            <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          ) : (
                            <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Contact */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="border-0 bg-gradient-to-br from-warning/5 to-destructive/5 border-warning/20">
              <CardContent className="p-8">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Security Concerns?</h2>
                </div>
                
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  If you discover a security vulnerability or have concerns about our security practices, 
                  please contact our security team immediately.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <div className="text-sm text-muted-foreground">
                    <strong>Security Email:</strong> security@tenantflow.app
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Response Time:</strong> Within 4 hours
                  </div>
                </div>

                <div className="mt-6">
                  <Button 
                    asChild
                    variant="outline" 
                    className="hover:bg-warning/5 hover:border-warning/50"
                  >
                    <Link href="mailto:security@tenantflow.app">
                      Report Security Issue
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  )
}