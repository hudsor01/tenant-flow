'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type GradientVariant = 
  | 'hero' | 'luxury' | 'properties' | 'property-luxury' 
  | 'dashboard' | 'income' | 'tenants' | 'billing' | 'premium'
  | 'animated-luxury' | 'animated-success' | 'glass'

interface GradientTextProps {
  children: React.ReactNode
  variant: GradientVariant
  className?: string
  animate?: boolean
  hover?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'
}

export function GradientText({ 
  children, 
  variant, 
  className,
  animate = false,
  hover = false,
  as: Component = 'span'
}: GradientTextProps) {
  
  const gradientClasses = {
    'hero': 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600',
    'luxury': 'bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-600',
    'properties': 'bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800',
    'property-luxury': 'bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700',
    'dashboard': 'bg-gradient-to-r from-green-600 via-emerald-500 to-green-600',
    'income': 'bg-gradient-to-r from-emerald-600 to-green-400',
    'tenants': 'bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600',
    'billing': 'bg-gradient-to-r from-blue-800 via-blue-600 to-blue-800',
    'premium': 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500',
    'animated-luxury': 'bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-600',
    'animated-success': 'bg-gradient-to-r from-green-600 via-emerald-500 to-green-600',
    'glass': 'bg-gradient-to-r from-white/20 via-white/40 to-white/20'
  }

  const animationClasses = {
    'animated-luxury': 'animate-gradient-x bg-[length:200%_200%]',
    'animated-success': 'animate-gradient-x bg-[length:200%_200%]'
  }

  const baseClasses = cn(
    'bg-clip-text text-transparent font-bold',
    gradientClasses[variant],
    variant.includes('animated') && animationClasses[variant as keyof typeof animationClasses],
    hover && 'transition-all duration-300 hover:scale-105',
    className
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={baseClasses}
        {...(hover && {
          whileHover: { 
            scale: 1.05,
            textShadow: "0 0 8px rgb(var(--primary-rgb) / 0.3)"
          }
        })}
      >
        <Component>{children}</Component>
      </motion.div>
    )
  }

  return (
    <Component className={baseClasses}>
      {children}
    </Component>
  )
}

// Specific gradient text components for different pages
export function HeroGradientText({ children, className, ...props }: Omit<GradientTextProps, 'variant'>) {
  return (
    <GradientText variant="hero" className={cn('text-6xl md:text-8xl', className)} {...props}>
      {children}
    </GradientText>
  )
}

export function PropertyGradientText({ children, className, ...props }: Omit<GradientTextProps, 'variant'>) {
  return (
    <GradientText variant="property-luxury" className={cn('text-4xl md:text-6xl', className)} {...props}>
      {children}
    </GradientText>
  )
}

export function DashboardGradientText({ children, className, ...props }: Omit<GradientTextProps, 'variant'>) {
  return (
    <GradientText variant="dashboard" className={cn('text-3xl md:text-5xl', className)} {...props}>
      {children}
    </GradientText>
  )
}

export function IncomeGradientText({ children, className, ...props }: Omit<GradientTextProps, 'variant'>) {
  return (
    <GradientText variant="income" className={cn('text-2xl md:text-4xl font-black', className)} {...props}>
      {children}
    </GradientText>
  )
}