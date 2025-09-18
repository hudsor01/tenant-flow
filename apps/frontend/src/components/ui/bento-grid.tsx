"use client"

import React, { useState } from "react"
import { useSpring } from "@react-spring/core"
import { animated } from "@react-spring/web"
import { cn } from "@/lib/utils"

interface BentoGridProps {
  children: React.ReactNode
  className?: string
}

interface BentoCardProps {
  id?: string
  children: React.ReactNode
  className?: string
  variant?: "default" | "interactive" | "elevated" | "minimal"
  colSpan?: 1 | 2 | 3 | 4 | 6
  rowSpan?: 1 | 2 | 3
  hover?: boolean
}

interface BentoTitleProps {
  children?: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
}

interface BentoDescriptionProps {
  children?: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg"
}

interface BentoContentProps {
  children: React.ReactNode
  className?: string
}

interface BentoFeature {
  id: string
  title?: string
  description?: string
  content: React.ReactNode
  className?: string
  variant?: "default" | "interactive" | "elevated" | "minimal"
  colSpan?: 1 | 2 | 3 | 4 | 6
  rowSpan?: 1 | 2 | 3
  hover?: boolean
}

interface BentoGridWithFeaturesProps {
  features: BentoFeature[]
  className?: string
}


// Main Bento Grid Container
const BentoGrid = ({ children, className }: BentoGridProps) => {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 w-full max-w-7xl mx-auto",
      className
    )}>
      {children}
    </div>
  )
}

// Individual Bento Card with variants
const BentoCard = ({ 
  id, 
  children, 
  className, 
  variant = "default",
  colSpan = 1,
  rowSpan = 1,
  hover = true
}: BentoCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const cardSpring = useSpring({
    transform: isHovered && hover ? 'scale(1.02) translateY(-2px)' : 'scale(1) translateY(0px)',
    boxShadow: isHovered && hover
      ? '0 20px 25px -5px hsl(var(--foreground) / 0.1), 0 8px 10px -6px hsl(var(--foreground) / 0.1)'
      : '0 1px 3px 0 hsl(var(--foreground) / 0.1), 0 1px 2px -1px hsl(var(--foreground) / 0.1)',
    config: { tension: 400, friction: 30 }
  })

  const glowSpring = useSpring({
    opacity: isHovered && variant === "interactive" ? 1 : 0,
    config: { duration: 300 }
  })

  const getVariantStyles = () => {
    switch (variant) {
      case "interactive":
        return "bg-gradient-to-br from-card via-background to-muted/20 border-2 border-border hover:border-primary/30 cursor-pointer"
      case "elevated":
        return "bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:shadow-xl"
      case "minimal":
        return "bg-transparent border border-muted hover:border-border"
      default:
        return "bg-card border border-border hover:shadow-md"
    }
  }

  const getColSpanClass = () => {
    switch (colSpan) {
      case 2: return "md:col-span-2 lg:col-span-2"
      case 3: return "md:col-span-2 lg:col-span-3"
      case 4: return "md:col-span-2 lg:col-span-4"
      case 6: return "md:col-span-2 lg:col-span-6"
      default: return "md:col-span-1 lg:col-span-1"
    }
  }

  const getRowSpanClass = () => {
    switch (rowSpan) {
      case 2: return "row-span-2"
      case 3: return "row-span-3"
      default: return "row-span-1"
    }
  }

  return (
    <animated.div
      id={id}
      style={cardSpring}
      className={cn(
        "relative overflow-hidden p-6 rounded-2xl transition-all duration-300",
        getVariantStyles(),
        getColSpanClass(),
        getRowSpanClass(),
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Premium glow effect for interactive cards */}
      {variant === "interactive" && (
        <animated.div
          style={glowSpring}
          className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl"
        />
      )}
      
      {/* Grid pattern overlay for elevated cards */}
      {variant === "elevated" && (
        <div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      <div className="relative z-10">
        {children}
      </div>
    </animated.div>
  )
}

// Bento Card Title with size variants
const BentoTitle = ({ children, className, size = "md" }: BentoTitleProps) => {
  if (!children) return null
  
  const getSizeStyles = () => {
    switch (size) {
      case "sm": return "text-lg font-semibold"
      case "lg": return "text-2xl font-bold"
      case "xl": return "text-3xl font-bold"
      default: return "text-xl font-semibold"
    }
  }

  return (
    <h3 className={cn(
      "text-foreground tracking-tight leading-tight mb-3",
      getSizeStyles(),
      className
    )}>
      {children}
    </h3>
  )
}

// Bento Card Description with size variants
const BentoDescription = ({ children, className, size = "md" }: BentoDescriptionProps) => {
  if (!children) return null
  
  const getSizeStyles = () => {
    switch (size) {
      case "sm": return "text-sm"
      case "lg": return "text-base"
      default: return "text-sm"
    }
  }

  return (
    <p className={cn(
      "text-muted-foreground leading-relaxed mb-4",
      getSizeStyles(),
      className
    )}>
      {children}
    </p>
  )
}

// Bento Card Content Wrapper
const BentoContent = ({ children, className }: BentoContentProps) => {
  return (
    <div className={cn("h-full w-full", className)}>
      {children}
    </div>
  )
}

// Complete Bento Grid with Features Array
const BentoGridWithFeatures = ({ features, className }: BentoGridWithFeaturesProps) => {
  return (
    <div className="relative">
      <BentoGrid className={className}>
        {features.map((feature) => (
          <BentoCard
            key={feature.id}
            id={feature.id}
            className={feature.className}
            variant={feature.variant}
            colSpan={feature.colSpan}
            rowSpan={feature.rowSpan}
            hover={feature.hover}
          >
            <BentoTitle>{feature.title}</BentoTitle>
            <BentoDescription>{feature.description}</BentoDescription>
            <BentoContent>{feature.content}</BentoContent>
          </BentoCard>
        ))}
      </BentoGrid>
    </div>
  )
}

export {
  BentoGrid,
  BentoCard,
  BentoTitle,
  BentoDescription,
  BentoContent,
  BentoGridWithFeatures,
  type BentoFeature,
  type BentoGridProps,
  type BentoCardProps,
}