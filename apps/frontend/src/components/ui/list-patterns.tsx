/**
 * List Pattern Components - Server Components
 * 
 * Reusable list and table patterns for displaying collections
 * Server components for optimal performance and SEO
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button' // Currently unused
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// LIST ITEM
// ============================================================================

interface ListItemProps {
  title: string
  subtitle?: string
  description?: string
  avatar?: React.ReactNode
  badges?: {
    label: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }[]
  metadata?: {
    label: string
    value: string
  }[]
  actions?: React.ReactNode
  className?: string
  onClick?: () => void
}

export function ListItem({
  title,
  subtitle,
  description,
  avatar,
  badges = [],
  metadata = [],
  actions,
  className,
  onClick
}: Readonly<ListItemProps>) {
  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 border rounded-lg transition-colors",
        onClick && "hover:bg-muted/50 cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {avatar && (
            <div className="flex-shrink-0">
              {avatar}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
              
              {badges.length > 0 && (
                <div className="flex gap-1 flex-wrap">
{badges.map((badge) => (
  <Badge key={badge.label} variant={badge.variant} className="text-xs">
    {badge.label}
  </Badge>
))}
                </div>
              )}
            </div>
            
            {description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {description}
              </p>
            )}
            
{metadata.length > 0 && (
  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
    {metadata.map((item) => (
      <div key={item.label}>
        <span className="font-medium">{item.label}:</span>{' '}
        <span>{item.value}</span>
      </div>
    ))}
  </div>
)}
          </div>
        </div>
        
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </Component>
  )
}

// ============================================================================
// GROUPED LIST
// ============================================================================

interface GroupedListProps {
  title?: string
  groups: {
    title: string
    items: { key: string; node: React.ReactNode }[]
  }[]
  className?: string
}

export function GroupedList({
  title,
  groups,
  className
}: Readonly<GroupedListProps>) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : ""}>
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.items.map((item, itemIndex) => (
                  <React.Fragment key={item.key}>
                    {item.node}
                    {itemIndex < group.items.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// FEED LIST
// ============================================================================

interface FeedItemProps {
  avatar?: React.ReactNode
  title: string
  description?: string
  timestamp: string
  actions?: React.ReactNode
  className?: string
}

export function FeedItem({
  avatar,
  title,
  description,
  timestamp,
  actions,
  className
}: Readonly<FeedItemProps>) {
  return (
    <div className={cn("flex gap-3 p-3", className)}>
      {avatar && (
        <div className="flex-shrink-0">
          {avatar}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {title}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {timestamp}
            </p>
          </div>
          
          {actions && (
            <div className="flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface FeedListProps {
  items: React.ComponentProps<typeof FeedItem>[]
  title?: string
  emptyMessage?: string
  className?: string
}

export function FeedList({
  items,
  title,
  emptyMessage = "No items to display",
  className
}: Readonly<FeedListProps>) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : ""}>
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item, index) => {
              const key = `${item.title}-${item.timestamp}`;
              return (
                <React.Fragment key={key}>
                  <FeedItem {...item} />
                  {index < items.length - 1 && (
                    <Separator />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
