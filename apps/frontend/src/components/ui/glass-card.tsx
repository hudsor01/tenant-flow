/**
 * Glass Card Component - Premium glass morphism effect
 * Inspired by Linear and modern design systems
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "framer-motion"

const glassCardVariants = cva(
  "relative overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-500",
  {
    variants: {
      variant: {
        default: [
          "bg-background/30",
          "border border-border/50",
          "shadow-lg shadow-black/5",
          "hover:bg-background/40",
          "hover:border-border/60",
          "hover:shadow-xl hover:shadow-black/10"
        ],
        elevated: [
          "bg-background/40",
          "border border-border/60",
          "shadow-xl shadow-black/10",
          "hover:bg-background/50",
          "hover:border-border/70",
          "hover:shadow-2xl hover:shadow-black/15"
        ],
        premium: [
          "bg-gradient-to-br from-background/20 to-background/40",
          "border border-primary/20",
          "shadow-xl shadow-primary/5",
          "hover:from-background/30 hover:to-background/50",
          "hover:border-primary/30",
          "hover:shadow-2xl hover:shadow-primary/10"
        ],
        dark: [
          "bg-black/20",
          "border border-white/10",
          "shadow-xl shadow-black/20",
          "hover:bg-black/30",
          "hover:border-white/20",
          "hover:shadow-2xl hover:shadow-black/30"
        ]
      },
      blur: {
        none: "",
        sm: "backdrop-blur-sm",
        md: "backdrop-blur-md",
        lg: "backdrop-blur-lg",
        xl: "backdrop-blur-xl",
        "2xl": "backdrop-blur-2xl",
        "3xl": "backdrop-blur-3xl"
      },
      glow: {
        none: "",
        subtle: "after:absolute after:inset-0 after:bg-gradient-to-t after:from-primary/5 after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-500",
        moderate: "after:absolute after:inset-0 after:bg-gradient-to-t after:from-primary/10 after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-500",
        intense: "after:absolute after:inset-0 after:bg-gradient-to-t after:from-primary/20 after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-500"
      }
    },
    defaultVariants: {
      variant: "default",
      blur: "xl",
      glow: "none"
    }
  }
)

export interface GlassCardProps
  extends Omit<HTMLMotionProps<"div">, "children">,
    VariantProps<typeof glassCardVariants> {
  asChild?: boolean
  gradient?: boolean
  noise?: boolean
  children?: React.ReactNode
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, blur, glow, gradient, noise, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(glassCardVariants({ variant, blur, glow, className }))}
        whileHover={{ scale: 1.01, y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        {...props}
      >
        {/* Gradient overlay */}
        {gradient && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
        )}
        
        {/* Noise texture */}
        {noise && (
          <div className="pointer-events-none absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat'
            }}
          />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Animated border gradient */}
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 hover:opacity-100"
          style={{
            background: "linear-gradient(45deg, transparent 30%, rgba(var(--primary-rgb), 0.1) 50%, transparent 70%)",
            filter: "blur(40px)",
            transform: "translateZ(0)"
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.div>
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard, glassCardVariants }