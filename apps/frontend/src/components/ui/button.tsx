/**
 * Enhanced Button Components
 * 
 * Extended button components with additional variants and patterns
 * commonly used throughout the application.
 */

"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { enhancedButtonVariants, type EnhancedButtonVariants } from "./variants"
import { Loader2 } from "lucide-react"

// ============================================================================
// ENHANCED BUTTON COMPONENT
// ============================================================================

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    EnhancedButtonVariants {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  animate?: boolean
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    asChild = false, 
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    animate = false,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading

    const buttonContent = (
      <>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        
        <span className={cn(loading && loadingText && "sr-only")}>
          {children}
        </span>
        
        {loading && loadingText && (
          <span>{loadingText}</span>
        )}
        
        {!loading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </>
    )

    const buttonElement = (
      <Comp
        ref={ref}
        className={cn(
          enhancedButtonVariants({ variant, size, fullWidth }),
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </Comp>
    )

    if (animate && !asChild) {
      return (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          {buttonElement}
        </motion.div>
      )
    }

    return buttonElement
  }
)
EnhancedButton.displayName = "EnhancedButton"

// Export Button as an alias for EnhancedButton
const Button = EnhancedButton
Button.displayName = "Button"

// ============================================================================
// BUTTON GROUP COMPONENT
// ============================================================================

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  attach?: boolean
}

export function ButtonGroup({
  children,
  className,
  orientation = 'horizontal',
  attach = false,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex",
        orientation === 'horizontal' ? "flex-row" : "flex-col",
        attach ? (
          orientation === 'horizontal' 
            ? "[&>*:not(:first-child)]:ml-[-1px] [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none"
            : "[&>*:not(:first-child)]:mt-[-1px] [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none"
        ) : (
          orientation === 'horizontal' ? "space-x-2" : "space-y-2"
        ),
        className
      )}
      role="group"
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// ICON BUTTON COMPONENT
// ============================================================================

interface IconButtonProps extends Omit<EnhancedButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode
  label: string
  tooltip?: string
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, className, ...props }, ref) => {
    return (
      <EnhancedButton
        ref={ref}
        className={className}
        aria-label={label}
        title={props.tooltip || label}
        {...props}
      >
        {icon}
        <span className="sr-only">{label}</span>
      </EnhancedButton>
    )
  }
)
IconButton.displayName = "IconButton"

// ============================================================================
// CTA BUTTON COMPONENT
// ============================================================================

interface CTAButtonProps extends EnhancedButtonProps {
  priority?: 'primary' | 'secondary'
  glow?: boolean
  pulse?: boolean
}

export const CTAButton = React.forwardRef<HTMLButtonElement, CTAButtonProps>(
  ({ 
    priority = 'primary',
    glow = false,
    pulse = false,
    className,
    variant,
    ...props 
  }, ref) => {
    return (
      <EnhancedButton
        ref={ref}
        variant={variant || (priority === 'primary' ? 'cta' : 'outline')}
        className={cn(
          glow && "relative overflow-visible shadow-lg",
          glow && "before:absolute before:inset-[-2px] before:bg-gradient-to-r before:from-primary before:to-accent before:rounded-[inherit] before:opacity-60 before:blur-sm before:z-[-1]",
          pulse && "animate-pulse",
          className
        )}
        animate={true}
        {...props}
      />
    )
  }
)
CTAButton.displayName = "CTAButton"

// ============================================================================
// LOADING BUTTON COMPONENT
// ============================================================================

interface LoadingButtonProps extends EnhancedButtonProps {
  loadingVariant?: 'spinner' | 'dots' | 'shimmer'
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ 
    loading,
    loadingVariant = 'spinner',
    children,
    className,
    ...props 
  }, ref) => {
    const loadingContent = {
      spinner: <Loader2 className="h-4 w-4 animate-spin" />,
      dots: (
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1 h-1 bg-current rounded-full animate-bounce" />
        </div>
      ),
      shimmer: (
        <div className="h-4 w-16 bg-current/20 rounded animate-pulse" />
      )
    }

    return (
      <EnhancedButton
        ref={ref}
        className={cn(
          loading && "cursor-not-allowed",
          className
        )}
        disabled={loading}
        {...props}
      >
        {loading ? loadingContent[loadingVariant] : children}
      </EnhancedButton>
    )
  }
)
LoadingButton.displayName = "LoadingButton"

// ============================================================================
// SPLIT BUTTON COMPONENT
// ============================================================================

interface SplitButtonProps extends Omit<EnhancedButtonProps, 'children'> {
  mainAction: {
    label: string
    onClick: () => void
  }
  dropdownActions: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
    destructive?: boolean
  }[]
}

export function SplitButton({
  mainAction,
  dropdownActions,
  variant = 'default',
  size = 'default',
  className,
  ...props
}: SplitButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="relative inline-flex">
      <EnhancedButton
        variant={variant}
        size={size}
        className={cn("rounded-r-none border-r-0", className)}
        onClick={mainAction.onClick}
        {...props}
      >
        {mainAction.label}
      </EnhancedButton>
      
      <EnhancedButton
        variant={variant}
        size={size}
        className="rounded-l-none px-2"
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </EnhancedButton>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
          {dropdownActions.map((action, index) => (
            <button
              key={index}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                action.destructive && "text-red-600 hover:bg-red-50 hover:text-red-700"
              )}
              onClick={() => {
                action.onClick()
                setIsOpen(false)
              }}
            >
              {action.icon && (
                <span className="mr-2">{action.icon}</span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// FLOATING ACTION BUTTON
// ============================================================================

interface FABProps extends EnhancedButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  offset?: string
}

export const FloatingActionButton = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ 
    position = 'bottom-right',
    offset = '2rem',
    className,
    size = 'lg',
    variant = 'default',
    ...props 
  }, ref) => {
    const positions = {
      'bottom-right': `fixed bottom-[${offset}] right-[${offset}]`,
      'bottom-left': `fixed bottom-[${offset}] left-[${offset}]`,
      'top-right': `fixed top-[${offset}] right-[${offset}]`,
      'top-left': `fixed top-[${offset}] left-[${offset}]`
    }

    return (
      <EnhancedButton
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          positions[position],
          "z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
          "hover:scale-105 active:scale-95",
          className
        )}
        animate={true}
        {...props}
      />
    )
  }
)
FloatingActionButton.displayName = "FloatingActionButton"

// Export components and variants
export { EnhancedButton, Button }
export { enhancedButtonVariants as buttonVariants }