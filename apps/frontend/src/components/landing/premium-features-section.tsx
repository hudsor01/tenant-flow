/**
 * Premium Features Section - Bento Grid Layout with Magic UI
 * Enhanced with property management metric visualizations
 */

"use client";

import { BorderBeam, BlurFade, NumberTicker, Meteors } from '@/components/magicui'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { INTERACTION_ANIMATIONS } from '@/lib/animations/constants'
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useState, useRef } from 'react'

// Mock data for property management metrics
const occupancyTrend = [
  { month: 'Jan', occupancy: 85 },
  { month: 'Feb', occupancy: 88 },
  { month: 'Mar', occupancy: 92 },
  { month: 'Apr', occupancy: 95 },
  { month: 'May', occupancy: 98 }
]

const maintenanceStatus = [
  { name: 'Complete', value: 75, color: '#10b981' },
  { name: 'In Progress', value: 20, color: '#f59e0b' },
  { name: 'Pending', value: 5, color: '#ef4444' }
]

const revenueData = [
  { month: 'Jan', revenue: 45000 },
  { month: 'Feb', revenue: 48000 },
  { month: 'Mar', revenue: 52000 },
  { month: 'Apr', revenue: 55000 },
  { month: 'May', revenue: 58000 }
]


interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  className?: string
  delay?: number
  showcase?: React.ReactNode
  highlight?: boolean
}

function FeatureCard({ title, description, icon, className, delay = 0, showcase, highlight }: FeatureCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  return (
    <BlurFade delay={delay}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        whileHover={{ scale: 1.02, y: -5 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "relative group overflow-hidden rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 lg:p-8",
          "hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500",
          highlight && "md:col-span-2 lg:col-span-2",
          className
        )}
      >
        {/* Cursor Follow Spotlight Effect */}
        {isHovering && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.06), transparent 40%)`
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Border Beam Effect on Hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <BorderBeam 
            size={300}
            duration={15}
            borderWidth={1.5}
          />
        </div>

        {/* Background Effects */}
        {highlight && (
          <div className="absolute inset-0 opacity-30">
            <Meteors number={10} />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-3 text-primary">
            <div className="text-2xl">{icon}</div>
          </div>

          {/* Title & Description */}
          <h3 className="mb-2 text-xl font-semibold tracking-tight lg:text-2xl">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground lg:text-base">
            {description}
          </p>

          {/* Showcase Content */}
          {showcase && (
            <div className="mt-6">
              {showcase}
            </div>
          )}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </motion.div>
    </BlurFade>
  )
}

export function PremiumFeaturesSection() {
  const features = [
    {
      title: "Smart Dashboard",
      description: "Real-time analytics and insights at your fingertips. Track occupancy, revenue, and maintenance all in one place.",
      icon: "📊",
      highlight: true,
      showcase: (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">
                <NumberTicker value={98} className="tabular-nums" />%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Occupancy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                $<NumberTicker value={156} />K
              </div>
              <div className="text-xs text-muted-foreground mt-1">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                <NumberTicker value={24} />hr
              </div>
              <div className="text-xs text-muted-foreground mt-1">Response</div>
            </div>
          </div>
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={occupancyTrend}>
                <Line 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )
    },
    {
      title: "Tenant Portal",
      description: "Self-service portal for tenants to pay rent, submit requests, and communicate.",
      icon: "👥",
      showcase: (
        <div className="flex items-center gap-2 mt-4">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background" />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">+24 active tenants</span>
        </div>
      )
    },
    {
      title: "Maintenance Tracking",
      description: "Streamline work orders from request to resolution with automated workflows.",
      icon: "🔧",
      showcase: (
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Work Orders</span>
            <span className="text-sm font-bold text-green-500">75% Complete</span>
          </div>
          <div className="h-20 w-full flex items-center justify-center">
            <ResponsiveContainer width="80%" height="100%">
              <PieChart>
                <Pie
                  data={maintenanceStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={35}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {maintenanceStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4">
            {maintenanceStatus.map((status, i) => (
              <div key={i} className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-xs text-muted-foreground">{status.name}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Financial Reports",
      description: "Comprehensive P&L statements, cash flow analysis, and tax-ready documentation.",
      icon: "💰",
      showcase: (
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monthly Revenue</span>
            <span className="text-lg font-bold text-green-500">+12.5%</span>
          </div>
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">$<NumberTicker value={58} />K</div>
            <div className="text-xs text-muted-foreground">Current Month</div>
          </div>
        </div>
      )
    },
    {
      title: "Document Management",
      description: "Secure storage for leases, contracts, and important documents with e-signature support.",
      icon: "📄",
      showcase: (
        <div className="flex gap-2 mt-4">
          {['PDF', 'DOC', 'IMG'].map((type) => (
            <div key={type} className="px-2 py-1 rounded-md bg-muted text-xs font-medium">
              {type}
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Multi-Property Support",
      description: "Manage unlimited properties from a single dashboard with role-based access control.",
      icon: "🏢",
      highlight: true,
      showcase: (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {['Downtown Plaza', 'Riverside Apartments', 'Business Park', 'Suburban Complex'].map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs truncate">{name}</span>
            </motion.div>
          ))}
        </div>
      )
    }
  ]

  return (
    <section className="section-spacing relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      
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
                ✨ Premium Features
              </span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Everything You Need to
                <span className="block bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Manage Properties Like a Pro
                </span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Powerful tools designed for modern property managers who demand excellence
              </p>
            </motion.div>
          </BlurFade>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              {...feature}
              delay={0.1 * (index + 1)}
            />
          ))}
        </div>

        {/* CTA Section */}
        <BlurFade delay={0.8}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-16 text-center"
          >
            <p className="mb-6 text-lg text-muted-foreground">
              Ready to transform your property management?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                {...INTERACTION_ANIMATIONS.PROMINENT_TAP}
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
              >
                See All Features
                <motion.span
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>
              <button className="inline-flex items-center justify-center rounded-full border border-border bg-background/50 backdrop-blur-sm px-8 py-3 text-base font-medium hover:bg-muted transition-all duration-300">
                Compare Plans
              </button>
            </div>
          </motion.div>
        </BlurFade>
      </div>
    </section>
  )
}
