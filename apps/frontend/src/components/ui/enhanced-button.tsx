"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, ArrowRight, ExternalLink, Download, Plus } from "lucide-react"
import { cn } from "@/lib/design-system"
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from "@repo/shared"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] hover:shadow-lg",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-primary/25",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-destructive/25",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-secondary/25",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        gradient: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:shadow-primary/50 hover:scale-[1.02] transition-all duration-300",
        glow: "bg-primary text-primary-foreground shadow-lg shadow-primary/50 hover:shadow-primary/75 hover:shadow-xl animate-pulse hover:animate-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-10 w-10",
      },
      loading: {
        true: "cursor-not-allowed opacity-70",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
  ripple?: boolean
  pulse?: boolean
  children?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false, 
    loadingText,
    icon,
    iconPosition = "left",
    ripple = false,
    pulse = false,
    asChild = false, 
    children,
    onClick,
    disabled,
    style,
    ...props 
  }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false)
    const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([])
    const buttonRef = React.useRef<HTMLButtonElement>(null)
    
    React.useImperativeHandle(ref, () => buttonRef.current!)

    const handleRipple = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple || loading || disabled) return
      
      const button = buttonRef.current
      if (!button) return

      const rect = button.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      const newRipple = {
        id: Date.now(),
        x,
        y,
      }
      
      setRipples(prev => [...prev, newRipple])
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 600)
    }, [ripple, loading, disabled])

    const handleMouseDown = () => setIsPressed(true)
    const handleMouseUp = () => setIsPressed(false)
    const handleMouseLeave = () => setIsPressed(false)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return
      handleRipple(event)
      onClick?.(event)
    }

    const Comp = asChild ? Slot : "button"
    
    const buttonStyle = {
      ...style,
      transition: `all ${ANIMATION_DURATIONS.medium} ${ANIMATION_EASINGS.easeInOut}`,
      transform: isPressed ? 'scale(0.95)' : undefined,
      ...(pulse && {
        animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
      })
    }

    const content = (
      <>
        {/* Ripple effect */}
        {ripple && (
          <div className="absolute inset-0 overflow-hidden rounded-md">
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="absolute bg-white/30 rounded-full animate-ping"
                style={{
                  left: ripple.x - 4,
                  top: ripple.y - 4,
                  width: 8,
                  height: 8,
                  animationDuration: '600ms',
                }}
              />
            ))}
          </div>
        )}
        
        {/* Loading spinner */}
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        
        {/* Left icon */}
        {!loading && icon && iconPosition === "left" && (
          <span className="mr-2 h-4 w-4 flex items-center justify-center">
            {icon}
          </span>
        )}
        
        {/* Button text */}
        <span className={cn(
          "transition-all duration-200",
          loading && loadingText ? "opacity-0" : "opacity-100"
        )}>
          {children}
        </span>
        
        {/* Loading text overlay */}
        {loading && loadingText && (
          <span className="absolute inset-0 flex items-center justify-center">
            {loadingText}
          </span>
        )}
        
        {/* Right icon */}
        {!loading && icon && iconPosition === "right" && (
          <span className="ml-2 h-4 w-4 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
            {icon}
          </span>
        )}
      </>
    )

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, loading, className }),
          "group relative overflow-hidden",
          ripple && "cursor-pointer"
        )}
        ref={buttonRef}
        disabled={disabled || loading}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={buttonStyle}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)

Button.displayName = "Button"

// Preset button components for common use cases
const ActionButton = React.forwardRef<
  HTMLButtonElement, 
  ButtonProps & { action?: "save" | "delete" | "download" | "external" | "add" }
>(({ action = "save", children, ...props }, ref) => {
  const actionConfig = {
    save: { icon: <ArrowRight className="h-4 w-4" />, iconPosition: "right" as const },
    delete: { variant: "destructive" as const },
    download: { icon: <Download className="h-4 w-4" />, iconPosition: "left" as const },
    external: { icon: <ExternalLink className="h-4 w-4" />, iconPosition: "right" as const },
    add: { icon: <Plus className="h-4 w-4" />, iconPosition: "left" as const },
  }

  return (
    <Button
      ref={ref}
      ripple
      {...actionConfig[action]}
      {...props}
    >
      {children}
    </Button>
  )
})

ActionButton.displayName = "ActionButton"

const PulseButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return <Button ref={ref} pulse ripple variant="gradient" {...props} />
  }
)

PulseButton.displayName = "PulseButton"

const GlowButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return <Button ref={ref} variant="glow" ripple {...props} />
  }
)

GlowButton.displayName = "GlowButton"

export { Button, ActionButton, PulseButton, GlowButton, buttonVariants }