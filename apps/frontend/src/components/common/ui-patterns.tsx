/**
 * Common UI Patterns
 * 
 * Reusable UI pattern components that eliminate duplication
 * across different domain areas (properties, tenants, leases, etc.)
 * 
 * These patterns abstract common layouts and interactions
 * while remaining flexible for specific use cases.
 */

"use client"

import React from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Eye,
  ChevronRight,
  Building2,
  Users,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
// import { createAsyncHandler } from '@/utils/async-handlers'
import { formatCurrency } from '@repo/shared'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives'
import { StatCard, Grid, Stack, EmptyState } from '@/components/ui/primitives'

// ============================================================================
// INTERACTIVE CARD PATTERN
// ============================================================================

interface InteractiveCardProps {
  title: string
  subtitle?: string
  description?: string
  imageUrl?: string
  fallbackIcon?: React.ReactNode
  stats?: {
    icon: React.ReactNode
    label: string
    value: string | number
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'accent'
  }[]
  badges?: {
    label: string
    variant?: 'default' | 'success' | 'warning' | 'error'
  }[]
  actions?: {
    onView?: () => void
    onEdit?: () => void
    onDelete?: () => void
    customActions?: {
      label: string
      icon: React.ReactNode
      onClick: () => void
      variant?: 'default' | 'destructive'
    }[]
  }
  className?: string
  animationDelay?: number
}

export function InteractiveCard({
  title,
  subtitle,
  description,
  imageUrl,
  fallbackIcon = <Building2 className="h-16 w-16 text-white/70" />,
  stats = [],
  badges = [],
  actions,
  className,
  animationDelay = 0
}: InteractiveCardProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, delay: animationDelay }
    },
    hover: {
      y: -4,
      transition: { duration: 0.2 }
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="group"
    >
      <Card className={cn(
        "overflow-hidden border-0 bg-gradient-to-br from-card via-card to-card/95 shadow-lg",
        "backdrop-blur-sm transition-all duration-300",
        "hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/20",
        className
      )}>
        {/* Image/Icon Header */}
        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              {fallbackIcon}
            </div>
          )}

          {/* Actions Dropdown */}
          {actions && (
            <div className="absolute top-3 right-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {actions.onView && (
                    <DropdownMenuItem onClick={actions.onView}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  {actions.onEdit && (
                    <DropdownMenuItem onClick={actions.onEdit}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {actions.customActions?.map((action, index) => (
                    <DropdownMenuItem 
                      key={index} 
                      onClick={action.onClick}
                      className={action.variant === 'destructive' ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : undefined}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                  {actions.onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={actions.onDelete}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
              {badges.map((badge, index) => (
                <Badge 
                  key={index} 
                  variant={badge.variant === 'success' ? 'secondary' : badge.variant === 'warning' ? 'outline' : badge.variant === 'error' ? 'destructive' : 'default'} 
                  className="text-white"
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Card Content */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-foreground mb-1 transition-colors group-hover:text-primary">
                {title}
              </CardTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground flex items-center">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Description */}
          {description && (
            <p className="text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}

          {/* Statistics Grid */}
          {stats.length > 0 && (
            <Grid cols={2} gap="sm">
              {stats.map((stat, index) => (
                <StatCard
                  key={index}
                  variant={stat.variant || 'muted'}
                  icon={stat.icon}
                  label={stat.label}
                  value={stat.value}
                />
              ))}
            </Grid>
          )}

          {/* Action Buttons */}
          {actions && (actions.onView || actions.onEdit) && (
            <Stack direction="horizontal" spacing="sm">
              {actions.onView && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  onClick={actions.onView}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              )}
              {actions.onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 transition-colors hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                  onClick={actions.onEdit}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// LIST ITEM PATTERN
// ============================================================================

interface ListItemProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  description?: string
  meta?: string
  status?: 'success' | 'warning' | 'error' | 'pending' | 'default'
  amount?: number | string
  actions?: {
    onView?: () => void
    onEdit?: () => void
    onDelete?: () => void
  }
  className?: string
  onClick?: () => void
}

export function ListItem({
  icon,
  title,
  subtitle,
  description,
  meta,
  status = 'default',
  amount,
  actions,
  className,
  onClick
}: ListItemProps) {
  const statusIcons = {
    success: <CheckCircle className="h-4 w-4 text-green-600" />,
    warning: <AlertCircle className="h-4 w-4 text-orange-600" />,
    error: <XCircle className="h-4 w-4 text-red-600" />,
    pending: <Clock className="h-4 w-4 text-blue-600" />,
    default: null
  }

  const statusColors = {
    success: 'border-l-green-500',
    warning: 'border-l-orange-500',
    error: 'border-l-red-500', 
    pending: 'border-l-blue-500',
    default: 'border-l-transparent'
  }

  return (
    <Card
      variant={onClick ? 'interactive' : 'default'}
      className={cn(
        "border-l-4",
        statusColors[status],
        className
      )}
      onClick={onClick}
    >
      <CardContent>
        <Stack direction="horizontal" align="center" justify="between">
          <Stack direction="horizontal" align="center" spacing="md" className="flex-1">
            {icon && (
              <div className="text-muted-foreground">
                {icon}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{title}</h3>
                {statusIcons[status]}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {description}
                </p>
              )}
              {meta && (
                <p className="text-xs text-muted-foreground mt-1">{meta}</p>
              )}
            </div>
          </Stack>

          <Stack direction="horizontal" align="center" spacing="md">
            {amount && (
              <div className="text-right">
                <p className="font-semibold">
                  {typeof amount === 'number' ? formatCurrency(amount) : amount}
                </p>
              </div>
            )}

            {actions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.onView && (
                    <DropdownMenuItem onClick={actions.onView}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                  )}
                  {actions.onEdit && (
                    <DropdownMenuItem onClick={actions.onEdit}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {actions.onDelete && (
                    <DropdownMenuItem 
                      onClick={actions.onDelete}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {onClick && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// DATA DISPLAY PATTERNS
// ============================================================================

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon?: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  variant = 'default',
  className
}: MetricCardProps) {
  const variants = {
    default: 'bg-card border-border',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-orange-50 border-orange-200',
    error: 'bg-red-50 border-red-200'
  }

  const iconColors = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-green-600',
    warning: 'text-orange-600',
    error: 'text-red-600'
  }

  return (
    <Card className={cn(variants[variant], className)}>
      <CardContent>
        <Stack spacing="sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{title}</p>
            {icon && (
              <div className={iconColors[variant]}>
                {icon}
              </div>
            )}
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <div className={cn(
                "flex items-center text-sm",
                change.type === 'increase' && "text-green-600",
                change.type === 'decrease' && "text-red-600",
                change.type === 'neutral' && "text-muted-foreground"
              )}>
                {change.type === 'increase' && '↗'}
                {change.type === 'decrease' && '↘'}
                {change.value}
              </div>
            )}
          </div>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COLLECTION PATTERNS
// ============================================================================

interface CollectionHeaderProps {
  title: string
  description?: string
  itemCount?: number
  actions?: React.ReactNode
  filters?: React.ReactNode
  className?: string
}

export function CollectionHeader({
  title,
  description,
  itemCount,
  actions,
  filters,
  className
}: CollectionHeaderProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <Stack direction="horizontal" align="start" justify="between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
          {typeof itemCount === 'number' && (
            <p className="text-sm text-muted-foreground mt-1">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </Stack>
      {filters}
    </div>
  )
}

interface CollectionGridProps<T = unknown> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  cols?: 1 | 2 | 3 | 4 | 'auto'
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  emptyState?: {
    title: string
    description?: string
    icon?: React.ReactNode
    action?: React.ReactNode
  }
  loading?: boolean
  loadingCount?: number
  className?: string
}

export function CollectionGrid<T = unknown>({
  items,
  renderItem,
  cols = 3,
  gap = 'lg',
  emptyState,
  loading = false,
  loadingCount = 6,
  className
}: CollectionGridProps<T>) {
  if (loading) {
    return (
      <Grid cols={cols} gap={gap} className={className}>
        {Array.from({ length: loadingCount }).map((_, index) => (
          <Card key={index} className="animate-pulse">
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
        ))}
      </Grid>
    )
  }

  if (items.length === 0 && emptyState) {
    return (
      <EmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
        className={className}
      />
    )
  }

  return (
    <Grid cols={cols} gap={gap} className={className}>
      {items.map((item, index) => renderItem(item, index))}
    </Grid>
  )
}

// ============================================================================
// FORM SECTION PATTERN
// ============================================================================

interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  required?: boolean
}

export function FormSection({
  title,
  description,
  required = false,
  children,
  className,
  ...props
}: FormSectionProps) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div className="pb-4 border-b">
        <h3 className="text-lg font-semibold">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

export {
  // Re-export common icons for convenience
  Building2 as BuildingIcon,
  Users as UsersIcon,
  FileText as FileIcon,
  Calendar as CalendarIcon,
  DollarSign as DollarIcon,
  AlertCircle as AlertIcon,
  CheckCircle as CheckIcon,
  Clock as ClockIcon,
  XCircle as ErrorIcon
}