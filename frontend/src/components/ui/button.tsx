import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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
          className={cn(buttonVariants({ variant, size, className }))}
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
Button.displayName = "Button"

// Specific button variants for common use cases
export const PremiumButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} variant="premium" ref={ref} />
)
PremiumButton.displayName = "PremiumButton"

export const SocialButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} variant="social" ref={ref} />
)
SocialButton.displayName = "SocialButton"

export const GlassButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button {...props} variant="glass" ref={ref} />
)
GlassButton.displayName = "GlassButton"

export { Button }