import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const enhancedButtonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden",
  {
    variants: {
      variant: {
        // Premium primary button with gradient and shadow
        premium: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 border border-blue-500/20",
        
        // Modern glass-morphism style
        glass: "bg-white/10 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/20 shadow-lg",
        
        // Elevated outline with better shadows
        outline: "border-2 border-border bg-background hover:bg-muted/50 shadow-md hover:shadow-lg hover:border-border/80",
        
        // Social login buttons
        social: "bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-md hover:shadow-lg text-gray-700",
        
        // Success/confirmation style
        success: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/25",
        
        // Ghost with subtle hover
        ghost: "hover:bg-muted/60 hover:shadow-sm",
        
        // Link style with underline animation
        link: "text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline font-medium"
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 px-4 py-2",
        lg: "h-12 px-8 py-3 text-base",
        xl: "h-14 px-10 py-4 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "premium",
      size: "default",
    },
  }
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, icon, rightIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const buttonContent = (
      <>
        {/* Background shimmer effect for premium variant */}
        {variant === "premium" && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        )}
        
        {/* Loading spinner */}
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        
        {/* Left icon */}
        {!loading && icon && (
          <span className="mr-2 flex items-center">
            {icon}
          </span>
        )}
        
        {/* Button text */}
        <span className="relative z-10">{children}</span>
        
        {/* Right icon */}
        {rightIcon && (
          <span className="ml-2 flex items-center">
            {rightIcon}
          </span>
        )}
      </>
    )

    return (
      <motion.div
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ duration: 0.15 }}
        className="inline-block"
      >
        <Comp
          className={cn(enhancedButtonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled || loading}
          {...props}
        >
          {buttonContent}
        </Comp>
      </motion.div>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

// Specific button variants for common use cases
export const PremiumButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton {...props} variant="premium" ref={ref} />
)
PremiumButton.displayName = "PremiumButton"

export const SocialButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton {...props} variant="social" ref={ref} />
)
SocialButton.displayName = "SocialButton"

export const GlassButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton {...props} variant="glass" ref={ref} />
)
GlassButton.displayName = "GlassButton"

export { EnhancedButton }