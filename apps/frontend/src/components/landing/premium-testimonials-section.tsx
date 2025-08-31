/**
 * Premium Testimonials Section with Magic UI
 * Enhanced with animated customer success metrics
 */

"use client";

import { BlurFade, BorderBeam, NumberTicker, Marquee } from '@/components/magicui'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Star, Quote, Check } from 'lucide-react'
import { BORDER_BEAM_PRESETS, INTERACTION_ANIMATIONS } from '@/lib/animations/constants'

interface Testimonial {
  id: string
  name: string
  role: string
  company: string
  content: string
  rating: number
  image?: string
  highlight?: string
  verified?: boolean
  companySize?: string
  location?: string
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Property Manager',
    company: 'Urban Living Properties',
    content: 'TenantFlow has completely transformed how we manage our 250+ unit portfolio. The automated workflows alone have saved us 20 hours per week.',
    rating: 5,
    highlight: 'Saved 20 hours/week',
    verified: true,
    companySize: '250+ units',
    location: 'Chicago, IL'
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'Real Estate Investor',
    company: 'Chen Holdings LLC',
    content: 'The real-time analytics dashboard gives me instant insights into my properties performance. I can make data-driven decisions faster than ever.',
    rating: 5,
    highlight: 'Real-time insights',
    verified: true,
    companySize: '150+ units',
    location: 'Austin, TX'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Operations Director',
    company: 'Sunset Apartments',
    content: 'Our maintenance response time improved by 60% after implementing TenantFlow. Tenants love the self-service portal!',
    rating: 5,
    highlight: '60% faster response',
    verified: true,
    companySize: '400+ units',
    location: 'Phoenix, AZ'
  },
  {
    id: '4',
    name: 'David Thompson',
    role: 'CEO',
    company: 'Premier Property Group',
    content: 'Scaling from 500 to 1000+ units was seamless with TenantFlow. The platform grows with your business.',
    rating: 5,
    highlight: 'Seamless scaling',
    verified: true,
    companySize: '1000+ units',
    location: 'Denver, CO'
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    role: 'Finance Manager',
    company: 'Anderson Realty',
    content: 'The financial reporting features are outstanding. Tax season used to be a nightmare, now it\'s a breeze.',
    rating: 5,
    highlight: 'Tax-ready reports',
    verified: true,
    companySize: '75+ units',
    location: 'Seattle, WA'
  },
  {
    id: '6',
    name: 'James Wilson',
    role: 'Founder',
    company: 'Wilson Property Management',
    content: 'We reduced vacancy rates by 30% using TenantFlow\'s marketing and tenant screening tools. Game changer!',
    rating: 5,
    highlight: '30% less vacancy',
    verified: true,
    companySize: '320+ units',
    location: 'Miami, FL'
  }
]

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  return (
    <BlurFade delay={0.1 * index}>
      <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 lg:p-8"
      >
        {/* Border Beam on Hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <BorderBeam {...BORDER_BEAM_PRESETS.MEDIUM} />
        </div>

        {/* Quote Icon */}
        <div className="absolute top-6 right-6 opacity-10">
          <Quote className="w-12 h-12 text-primary" />
        </div>

        {/* Rating Stars */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
            >
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <p className="text-muted-foreground mb-6 leading-relaxed">
          "{testimonial.content}"
        </p>

        {/* Highlight Badge */}
        {testimonial.highlight && (
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
            ✨ {testimonial.highlight}
          </div>
        )}

        {/* Author Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/60">
              {testimonial.image ? (
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
              )}
              {/* Verified Badge */}
              {testimonial.verified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                </div>
              )}
            </div>
            
            {/* Name & Role */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{testimonial.name}</span>
                {testimonial.verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {testimonial.role} at {testimonial.company}
              </div>
            </div>
          </div>

          {/* Company Details */}
          {(testimonial.companySize || testimonial.location) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {testimonial.companySize && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {testimonial.companySize}
                </span>
              )}
              {testimonial.location && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                  📍 {testimonial.location}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />
      </motion.div>
    </BlurFade>
  )
}

export function PremiumTestimonialsSection() {

  return (
    <section className="section-spacing relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <BlurFade delay={0}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
                ⭐ Customer Success Stories
              </span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Trusted by
                <span className="block bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Thousands of Property Managers
                </span>
              </h2>
              <p className="text-lg text-muted-foreground">
                See how TenantFlow is helping property managers save time and grow their business
              </p>
            </motion.div>
          </BlurFade>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} index={index} />
          ))}
        </div>

        {/* Stats Section */}
        <BlurFade delay={0.8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-4"
          >
            {[
              { label: 'Active Users', value: 10000, suffix: '+', icon: '👥' },
              { label: 'Properties Managed', value: 50000, suffix: '+', icon: '🏢' },
              { label: 'Average Rating', value: 4.9, suffix: '/5', icon: '⭐' },
              { label: 'Time Saved Weekly', value: 15, suffix: ' hrs', icon: '⏰' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="text-center"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  <NumberTicker value={stat.value} className="inline" />
                  {stat.suffix}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </BlurFade>

        {/* Live Activity Ticker */}
        <BlurFade delay={0.9}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 mb-12"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">🔴 Live Activity</h3>
              <p className="text-sm text-muted-foreground">
                See what property managers are doing right now
              </p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card/20 backdrop-blur-sm py-4">
              <Marquee className="py-2" pauseOnHover>
                {[
                  { user: 'Sarah M.', action: 'collected $12,500 in rent', time: '2 min ago', location: 'Seattle' },
                  { user: 'David L.', action: 'processed 5 maintenance requests', time: '5 min ago', location: 'Austin' },
                  { user: 'Maria R.', action: 'onboarded 3 new tenants', time: '8 min ago', location: 'Miami' },
                  { user: 'John K.', action: 'generated monthly reports', time: '12 min ago', location: 'Denver' },
                  { user: 'Lisa T.', action: 'filled vacant unit in 2 days', time: '15 min ago', location: 'Phoenix' },
                  { user: 'Mike W.', action: 'saved 6 hours with automation', time: '18 min ago', location: 'Chicago' },
                ].map((activity, i) => (
                  <div
                    key={i}
                    className="mx-4 flex items-center gap-3 rounded-full bg-card/50 backdrop-blur-sm border border-border/30 px-4 py-2 text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium">{activity.user}</span>
                    <span className="text-muted-foreground">{activity.action}</span>
                    <span className="text-xs text-primary">📍 {activity.location}</span>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </Marquee>
            </div>
          </motion.div>
        </BlurFade>

        {/* CTA */}
        <BlurFade delay={1}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 text-center"
          >
            <p className="mb-6 text-lg text-muted-foreground">
              Join thousands of satisfied property managers
            </p>
            <motion.button
              {...INTERACTION_ANIMATIONS.PROMINENT_TAP}
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Your Success Story
              <motion.span
                className="ml-2"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.button>
          </motion.div>
        </BlurFade>
      </div>
    </section>
  )
}
