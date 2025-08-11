'use client'

import React from 'react'
import { motion } from '@/lib/framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Users, Target, Zap, Heart, Shield, Award, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

const values = [
  {
    icon: Target,
    title: 'User-Focused',
    description: 'Every feature starts with understanding your actual needs, not what we think you need.'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Time is money. Our platform is optimized for speed so you can work efficiently.'
  },
  {
    icon: Heart,
    title: 'Built with Care',
    description: 'We obsess over the details so you can focus on growing your business.'
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Bank-level security and 99.9% uptime guarantee. Your data is safe with us.'
  }
]

// Server Component for static content
function CompanyStats() {
  const stats = [
    { label: 'Properties Managed', value: '10K+', icon: Building2 },
    { label: 'Happy Property Owners', value: '2.5K+', icon: Users },
    { label: 'Years of Experience', value: '8+', icon: Award },
    { label: 'Uptime Guarantee', value: '99.9%', icon: Shield }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const IconComponent = stat.icon
        return (
          <Card key={stat.label} className="border-0 bg-gradient-to-br from-white to-muted/30 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <IconComponent className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function AboutContent() {
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
              <Badge className="bg-gradient-to-r from-primary via-accent to-success text-white border-0 px-6 py-2 text-sm font-semibold shadow-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                About TenantFlow
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            >
              Revolutionizing{' '}
              <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
                Property Management
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              We're on a mission to simplify property management for everyone. From individual landlords 
              to large property management companies, TenantFlow makes it easy to manage properties, 
              tenants, and maintenance - all in one place.
            </motion.p>
          </div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <CompanyStats />
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="prose prose-lg mx-auto text-muted-foreground"
          >
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Our Story</h2>
            
            <div className="space-y-6 leading-relaxed">
              <p>
                TenantFlow was born from frustration. In 2016, our founders - property owners themselves - 
                were drowning in spreadsheets, paper leases, and endless phone calls. They knew there had to 
                be a better way to manage rental properties.
              </p>
              
              <p>
                After trying every property management software on the market, they found the same problems 
                everywhere: complex interfaces, bloated features, and pricing that didn't make sense for 
                small to medium property owners. So they decided to build something different.
              </p>
              
              <p>
                Starting with just five beta users in a co-working space in Austin, TenantFlow grew through 
                word-of-mouth from property owners who finally found software that actually made their lives easier. 
                No venture capital, no aggressive sales tactics - just a commitment to building the best property 
                management platform possible.
              </p>
              
              <p>
                Today, TenantFlow serves thousands of property owners worldwide, from individual investors 
                managing a single rental to large portfolios spanning multiple markets. Every feature we build, 
                every design decision we make, stems from real feedback from real property managers facing real challenges.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-muted/20 to-muted/10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-foreground mb-6">Our Values</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              These core principles guide every decision we make and every feature we build.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-0 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 h-full">
                    <CardContent className="p-6 text-center">
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-6">
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">{value.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="border-0 bg-gradient-to-br from-primary/5 via-accent/5 to-success/5 backdrop-blur-sm">
              <CardContent className="p-12">
                <h2 className="text-4xl font-bold text-foreground mb-6">Ready to Transform Your Property Management?</h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of property owners who've already simplified their operations with TenantFlow.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth/signup">
                    <Button variant="premium" size="lg" className="group">
                      Start Free Trial
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" size="lg">
                      Talk to Sales
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  )
}