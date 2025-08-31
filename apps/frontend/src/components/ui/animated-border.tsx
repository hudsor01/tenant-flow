/**
 * Animated Border Component - Stripe-inspired gradient borders
 * Features rotating gradients and glow effects
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface AnimatedBorderProps {
  children: React.ReactNode
  className?: string
  borderRadius?: string
  borderWidth?: number
  duration?: number
  gradient?: string[]
  blur?: number
  intensity?: number
}

export function AnimatedBorder({
  children,
  className,
  borderRadius = "1rem",
  borderWidth = 2,
  duration = 4,
  gradient = ["#3b82f6", "#8b5cf6", "#ec4899", "#3b82f6"],
  blur = 20,
  intensity = 1
}: AnimatedBorderProps) {
  const gradientString = `conic-gradient(from var(--angle), ${gradient.join(', ')})`
  
  return (
    <div className={cn("relative group", className)}>
      {/* Animated background gradient */}
      <motion.div
        className="absolute -inset-[2px] opacity-75 blur-sm group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: gradientString,
          borderRadius,
          filter: `blur(${blur}px)`,
          opacity: intensity
        }}
        animate={{
          '--angle': ['0deg', '360deg']
        }}
        transition={{
          '--angle': {
            duration,
            repeat: Infinity,
            ease: "linear"
          }
        }}
      />
      
      {/* Inner content with background */}
      <div 
        className="relative bg-background"
        style={{ 
          borderRadius,
          padding: `${borderWidth}px`
        }}
      >
        <div 
          className="relative bg-background"
          style={{ borderRadius: `calc(${borderRadius} - ${borderWidth}px)` }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Shimmer Border - Linear-style shimmer effect
 */
export function ShimmerBorder({
  children,
  className,
  shimmerColor = "rgba(255,255,255,0.1)",
  borderRadius = "0.5rem",
  duration = 3
}: {
  children: React.ReactNode
  className?: string
  shimmerColor?: string
  borderRadius?: string
  duration?: number
}) {
  return (
    <div className={cn("relative overflow-hidden p-[1px] group", className)} style={{ borderRadius }}>
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${shimmerColor} 50%, transparent 60%)`,
          backgroundSize: "200% 200%"
        }}
        animate={{
          backgroundPosition: ["200% 0%", "-200% 0%"]
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Border gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-border via-primary/20 to-border" />
      
      {/* Content */}
      <div 
        className="relative bg-background"
        style={{ borderRadius: `calc(${borderRadius} - 1px)` }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Pulse Border - Pulsing glow effect
 */
export function PulseBorder({
  children,
  className,
  color = "hsl(var(--primary))",
  borderRadius = "0.5rem",
  duration = 2
}: {
  children: React.ReactNode
  className?: string
  color?: string
  borderRadius?: string
  duration?: number
}) {
  return (
    <div className={cn("relative", className)}>
      {/* Pulsing glow */}
      <motion.div
        className="absolute -inset-[1px]"
        style={{
          background: color,
          borderRadius,
          filter: "blur(8px)",
          opacity: 0.5
        }}
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.05, 1]
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Static border */}
      <div 
        className="relative border border-primary/20 bg-background"
        style={{ borderRadius }}
      >
        {children}
      </div>
    </div>
  )
}