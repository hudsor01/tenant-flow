import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cardVariants, type CardVariants } from './variants'

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    CardVariants {
  asChild?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive, bordered, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, interactive, bordered, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { centered?: boolean }
>(({ className, centered = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5",
      centered && "items-center text-center",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    gradient?: boolean
  }
>(({ className, as: Component = 'h3', gradient = false, ...props }, ref) => {
  const gradientClass = gradient 
    ? "bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
    : ""
    
  return (
    <Component
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        gradientClass,
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { muted?: boolean }
>(({ className, muted = true, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm leading-relaxed",
      muted && "text-muted-foreground",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { noPadding?: boolean }
>(({ className, noPadding = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(!noPadding && "pt-0", className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    centered?: boolean
    spaced?: boolean 
  }
>(({ className, centered = false, spaced = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center",
      centered && "justify-center",
      spaced && "justify-between",
      !centered && !spaced && "justify-end",
      "pt-6",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }