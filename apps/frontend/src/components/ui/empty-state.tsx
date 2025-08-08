/**
 * Empty State Component - Server Component
 * 
 * Engaging empty states to guide users to take action
 */

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  secondaryAction?: {
    label: string
    href: string
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className
}: EmptyStateProps) {
  return (
    <Card className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <Button asChild>
            <Link href={action.href}>
              {action.label}
            </Link>
          </Button>
        )}
        
        {secondaryAction && (
          <Button variant="outline" asChild>
            <Link href={secondaryAction.href}>
              {secondaryAction.label}
            </Link>
          </Button>
        )}
      </div>
    </Card>
  )
}