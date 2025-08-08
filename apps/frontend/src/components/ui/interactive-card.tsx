'use client'

/**
 * Interactive Card - Client Component
 * 
 * Focused client component for interactive card behavior
 * Minimal JavaScript footprint for this specific pattern
 */

import React from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Eye,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface InteractiveCardProps {
  title: string
  subtitle?: string
  description?: string
  imageUrl?: string
  fallbackIcon?: React.ReactNode
  stats?: Array<{
    icon: React.ReactNode
    label: string
    value: string | number
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'accent'
  }>
  badges?: Array<{
    label: string
    variant?: 'default' | 'success' | 'warning' | 'error'
  }>
  actions?: {
    onView?: () => void
    onEdit?: () => void
    onDelete?: () => void
    customActions?: Array<{
      label: string
      icon: React.ReactNode
      onClick: () => void
      variant?: 'default' | 'destructive'
    }>
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
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={cn(
        "overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg",
        className
      )}>
        {/* Header with image/icon */}
        <div className="relative h-48 bg-gradient-to-br from-blue-600 to-purple-600">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              {fallbackIcon}
            </div>
          )}
          
          {/* Actions dropdown */}
          {actions && (
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/20">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
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
                  {actions.customActions?.map((action, index) => (
                    <DropdownMenuItem 
                      key={index}
                      onClick={action.onClick}
                      className={action.variant === 'destructive' ? "text-red-600" : ""}
                    >
                      <span className="mr-2">{action.icon}</span>
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                  {actions.onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={actions.onDelete}
                        className="text-red-600"
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
            <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
              {badges.map((badge, index) => {
                const badgeVariant = badge.variant === 'error' ? 'destructive' :
                                   badge.variant === 'success' ? 'secondary' :
                                   badge.variant === 'warning' ? 'outline' :
                                   'default'
                return (
                  <Badge key={index} variant={badgeVariant}>
                    {badge.label}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{title}</CardTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {description}
            </p>
          )}

          {/* Stats */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="text-muted-foreground">
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}