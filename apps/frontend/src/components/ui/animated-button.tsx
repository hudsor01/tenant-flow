/**
 * Animated Button Component
 * Enhanced button with subtle micro-interactions
 */

'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  success?: boolean
  className?: string
}

const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline"
}

const sizeVariants = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10"
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    children, 
    variant = 'default', 
    size = 'default', 
    loading = false,
    success = false,
    className, 
    disabled,
    ...props 
  }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          sizeVariants[size],
          className
        )}
        whileHover={!disabled && !loading ? { scale: 1.05 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.95 } : undefined}
        animate={success ? {
          backgroundColor: ["var(--primary)", "var(--success)", "var(--primary)"],
          transition: { duration: 0.5 }
        } : undefined}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30
        }}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mr-2"
          >
            <Loader2 className="h-4 w-4" />
          </motion.div>
        ) : null}
        {children}
      </motion.button>
    )
  }
)

AnimatedButton.displayName = 'AnimatedButton'

// Icon button with rotation animation
export function IconButton({ 
  icon: Icon,
  onClick,
  className,
  rotate = false,
  ...props
}: {
  icon: React.ElementType
  onClick?: () => void
  className?: string
  rotate?: boolean
} & HTMLMotionProps<'button'>) {
  return (
    <motion.button
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={rotate ? { rotate: 360 } : undefined}
      transition={rotate ? { duration: 0.5 } : { type: "spring", stiffness: 400, damping: 30 }}
      onClick={onClick}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </motion.button>
  )
}

// Floating action button
export function FloatingActionButton({ 
  icon: Icon,
  onClick,
  className,
  position = 'bottom-right'
}: {
  icon: React.ElementType
  onClick?: () => void
  className?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}) {
  const positions = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }
  
  return (
    <motion.button
      className={cn(
        "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        positions[position],
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
      onClick={onClick}
    >
      <Icon className="h-6 w-6" />
    </motion.button>
  )
}