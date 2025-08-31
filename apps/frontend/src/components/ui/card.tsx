import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  "bg-card/60 backdrop-blur-md text-card-foreground rounded-lg border border-border/50 shadow-lg transition-all duration-300 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 hover:scale-[1.01]",
        elevated: "shadow-xl -translate-y-1 scale-[1.01] border-primary/20",
        premium: "bg-gradient-to-br from-card/80 to-primary/5 border-primary/20 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-2 hover:scale-[1.02]",
        glass: "bg-background/20 backdrop-blur-xl border-border/30 shadow-2xl",
        glow: "bg-card shadow-lg shadow-primary/25 border-primary/30 hover:shadow-xl hover:shadow-primary/40",
        interactive: "cursor-pointer hover:-translate-y-2 hover:scale-[1.02] hover:shadow-xl hover:border-primary/40 active:scale-[0.99] active:translate-y-0",
        flat: "bg-card border-border shadow-sm hover:shadow-md",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "none",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5",
  {
    variants: {
      padding: {
        none: "",
        sm: "p-4 pb-2",
        default: "p-6 pb-4",
        lg: "p-8 pb-6",
        xl: "p-10 pb-8",
      },
      align: {
        start: "items-start text-left",
        center: "items-center text-center",
        end: "items-end text-right",
      },
    },
    defaultVariants: {
      padding: "default",
      align: "start",
    },
  }
)

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, padding, align, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardHeaderVariants({ padding, align, className }))}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const cardTitleVariants = cva(
  "font-semibold leading-tight tracking-tight",
  {
    variants: {
      size: {
        sm: "text-lg",
        default: "text-xl",
        lg: "text-2xl",
        xl: "text-3xl",
      },
      gradient: {
        false: "text-card-foreground",
        true: "bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent",
        brand: "bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent",
      },
    },
    defaultVariants: {
      size: "default",
      gradient: false,
    },
  }
)

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof cardTitleVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size, gradient, as: Component = 'h3', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(cardTitleVariants({ size, gradient, className }))}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const cardDescriptionVariants = cva(
  "text-muted-foreground leading-relaxed",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof cardDescriptionVariants> {}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, size, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(cardDescriptionVariants({ size, className }))}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

const cardContentVariants = cva(
  "",
  {
    variants: {
      padding: {
        none: "",
        sm: "p-4 pt-0",
        default: "p-6 pt-0",
        lg: "p-8 pt-0",
        xl: "p-10 pt-0",
      },
    },
    defaultVariants: {
      padding: "default",
    },
  }
)

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(cardContentVariants({ padding, className }))} 
      {...props} 
    />
  )
)
CardContent.displayName = 'CardContent'

const cardFooterVariants = cva(
  "flex items-center",
  {
    variants: {
      padding: {
        none: "",
        sm: "p-4 pt-0",
        default: "p-6 pt-0",
        lg: "p-8 pt-0",
        xl: "p-10 pt-0",
      },
      justify: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around",
      },
    },
    defaultVariants: {
      padding: "default",
      justify: "start",
    },
  }
)

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, padding, justify, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardFooterVariants({ padding, justify, className }))}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants,
  cardHeaderVariants,
  cardTitleVariants,
  cardDescriptionVariants,
  cardContentVariants,
  cardFooterVariants
}
