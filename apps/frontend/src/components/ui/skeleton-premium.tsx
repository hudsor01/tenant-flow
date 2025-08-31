/**
 * Premium Skeleton Loaders - Linear/Stripe-inspired loading states
 * Features smooth animations and sophisticated patterns
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "shimmer" | "pulse" | "wave" | "gradient"
  speed?: "slow" | "normal" | "fast"
  rounded?: "none" | "sm" | "md" | "lg" | "full"
}

export function Skeleton({
  className,
  variant = "shimmer",
  speed = "normal",
  rounded = "md",
  ...props
}: SkeletonProps) {
  const speedMap = {
    slow: 3,
    normal: 2,
    fast: 1
  }
  
  const roundedMap = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full"
  }
  
  const duration = speedMap[speed]
  
  // Filter out event props that conflict with Framer Motion
  const {
    onAnimationStart,
    onAnimationEnd,
    onAnimationIteration,
    onTransitionEnd,
    onDrag,
    onDragStart,
    onDragEnd,
    onDragCapture,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    ...safeProps
  } = props
  
  if (variant === "shimmer") {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-muted/50",
          roundedMap[rounded],
          className
        )}
        {...safeProps}
      >
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            translateX: ["100%", "200%"]
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
    )
  }
  
  if (variant === "pulse") {
    return (
      <motion.div
        className={cn(
          "bg-muted/50",
          roundedMap[rounded],
          className
        )}
        animate={{
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        {...safeProps}
      />
    )
  }
  
  if (variant === "wave") {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-muted/50",
          roundedMap[rounded],
          className
        )}
        {...safeProps}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
            backgroundSize: "200% 100%"
          }}
          animate={{
            backgroundPosition: ["200% 0", "-200% 0"]
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
    )
  }
  
  if (variant === "gradient") {
    return (
      <motion.div
        className={cn(
          "relative overflow-hidden",
          roundedMap[rounded],
          className
        )}
        style={{
          background: "linear-gradient(270deg, #1e293b, #334155, #475569, #334155, #1e293b)",
          backgroundSize: "400% 400%"
        }}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
        }}
        transition={{
          duration: duration * 2,
          repeat: Infinity,
          ease: "linear"
        }}
        {...safeProps}
      />
    )
  }
  
  return (
    <div
      className={cn(
        "animate-pulse bg-muted/50",
        roundedMap[rounded],
        className
      )}
      {...props}
    />
  )
}

/**
 * Card Skeleton - Premium card loading state
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 p-6", className)}>
      <Skeleton className="h-12 w-12" rounded="lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="space-y-2 pt-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

/**
 * Table Skeleton - Premium table loading state
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b pb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20 ml-auto" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <Skeleton className="h-4 w-24" variant="shimmer" speed="slow" />
          <Skeleton className="h-4 w-32" variant="shimmer" speed="slow" />
          <Skeleton className="h-4 w-28" variant="shimmer" speed="slow" />
          <Skeleton className="h-4 w-20 ml-auto" variant="shimmer" speed="slow" />
        </div>
      ))}
    </div>
  )
}

/**
 * Text Skeleton - Premium text loading state
 */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: `${100 - (i * 15)}%` }}
          variant="wave"
        />
      ))}
    </div>
  )
}