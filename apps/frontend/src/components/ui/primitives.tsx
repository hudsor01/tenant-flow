/**
 * Layout Primitive Components
 * 
 * Reusable layout building blocks that eliminate duplication
 * across the application. These components follow the compound
 * component pattern for maximum flexibility.
 * 
 * Server/Client Components:
 * - All primitives are server components by default
 * - Interactive variants marked with "use client"
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { 
  containerVariants,
  sectionVariants,
  cardVariants,
  statCardVariants,
  gridVariants,
  stackVariants,
  badgeVariants,
  type ContainerVariants,
  type SectionVariants,
  type CardVariants,
  type StatCardVariants,
  type GridVariants,
  type StackVariants,
  type BadgeVariants
} from './variants'

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

interface ContainerProps 
  extends React.HTMLAttributes<HTMLDivElement>,
          ContainerVariants {}

export function Container({ 
  className, 
  size, 
  padding, 
  ...props 
}: ContainerProps) {
  return (
    <div
      className={cn(containerVariants({ size, padding }), className)}
      {...props}
    />
  )
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
          SectionVariants {
  as?: 'section' | 'div' | 'article' | 'aside'
}

export function Section({
  className,
  spacing,
  background,
  as: Component = 'section',
  ...props
}: SectionProps) {
  return (
    <Component
      className={cn(sectionVariants({ spacing, background }), className)}
      {...props}
    />
  )
}

// ============================================================================
// ENHANCED CARD COMPONENT
// ============================================================================

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
          CardVariants {}

export function Card({ 
  className, 
  variant, 
  size, 
  spacing, 
  ...props 
}: CardProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant, size, spacing }),
        "flex flex-col",
        spacing === "compact" && "gap-3",
        spacing === "comfortable" && "gap-6", 
        spacing === "spacious" && "gap-8",
        className
      )}
      {...props}
    />
  )
}

// Card compound components
export function CardHeader({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

export function CardTitle({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

export function CardDescription({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export function CardContent({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6", className)}
      {...props}
    />
  )
}

export function CardFooter({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
          StatCardVariants {
  icon?: React.ReactNode
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export function StatCard({ 
  className,
  variant,
  size,
  icon,
  label,
  value,
  trend,
  trendValue,
  ...props 
}: StatCardProps) {
  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : null
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
  
  return (
    <div
      className={cn(
        statCardVariants({ variant, size }),
        "flex items-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className={cn(
          "mr-3 flex h-8 w-8 items-center justify-center rounded-lg",
          variant === "primary" && "bg-blue-100",
          variant === "success" && "bg-green-100",
          variant === "warning" && "bg-orange-100",
          variant === "error" && "bg-red-100",
          variant === "accent" && "bg-purple-100",
          variant === "muted" && "bg-muted"
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1">
        <p className="text-caption text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="stat-value text-lg font-semibold">{value}</p>
          {trend && trendValue && (
            <span className={cn("text-sm flex items-center", trendColor)}>
              {trendIcon} {trendValue}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// GRID COMPONENT
// ============================================================================

interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
          GridVariants {}

export function Grid({ 
  className, 
  cols, 
  gap, 
  ...props 
}: GridProps) {
  return (
    <div
      className={cn(gridVariants({ cols, gap }), className)}
      {...props}
    />
  )
}

// ============================================================================
// STACK COMPONENT
// ============================================================================

interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
          StackVariants {
  as?: 'div' | 'section' | 'article' | 'aside' | 'nav'
}

export function Stack({ 
  className,
  direction,
  align,
  justify,
  spacing,
  wrap,
  as: Component = 'div',
  ...props 
}: StackProps) {
  return (
    <Component
      className={cn(
        stackVariants({ direction, align, justify, spacing, wrap }),
        className
      )}
      {...props}
    />
  )
}

// ============================================================================
// ENHANCED BADGE COMPONENT
// ============================================================================

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
          BadgeVariants {
  icon?: React.ReactNode
  onRemove?: () => void
}

export function Badge({ 
  className,
  variant,
  size,
  icon,
  onRemove,
  children,
  ...props 
}: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-current/20 rounded-full p-0.5 -mr-1"
          aria-label="Remove"
        >
          <span className="sr-only">Remove</span>
          ×
        </button>
      )}
    </div>
  )
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 space-y-4",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="text-muted-foreground/60">
          {icon}
        </div>
      )}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && (
          <p className="text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>
      {action && action}
    </div>
  )
}

// ============================================================================
// LOADING STATES
// ============================================================================

export function LoadingCard({ className }: { className?: string }) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardContent>
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LoadingSkeleton({ 
  className, 
  count = 1 
}: { 
  className?: string 
  count?: number 
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse bg-muted rounded h-4",
            className
          )}
        />
      ))}
    </div>
  )
}

// ============================================================================
// FEATURE SECTION COMPONENT
// ============================================================================

interface FeatureSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  variant?: 'default' | 'accent' | 'muted'
}

export function FeatureSection({
  className,
  icon,
  title,
  description,
  action,
  variant = 'default',
  ...props
}: FeatureSectionProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-6 transition-all duration-200",
        variant === 'default' && "bg-card border",
        variant === 'accent' && "bg-gradient-subtle border-accent/20 border",
        variant === 'muted' && "bg-muted/30",
        className
      )}
      {...props}
    >
      <Stack spacing="md">
        {icon && (
          <div className="text-primary">
            {icon}
          </div>
        )}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {action && action}
      </Stack>
    </div>
  )
}