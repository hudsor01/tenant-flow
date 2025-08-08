'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type BillingInterval = 'monthly' | 'annual'

interface BillingToggleProps {
  value: BillingInterval
  onChange: (interval: BillingInterval) => void
  className?: string
}

/**
 * Client component for billing interval toggle
 * Needs interactivity for state management
 */
export function BillingToggle({ value, onChange, className }: BillingToggleProps) {
  return (
    <div className={`flex justify-center mb-12 ${className || ''}`}>
      <div className="bg-muted p-1 rounded-lg inline-flex">
        <button
          onClick={() => onChange('monthly')}
          className={cn(
            'px-6 py-3 rounded-md text-sm font-medium transition-all',
            value === 'monthly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Monthly Billing
        </button>
        <button
          onClick={() => onChange('annual')}
          className={cn(
            'px-6 py-3 rounded-md text-sm font-medium transition-all relative',
            value === 'annual'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Annual Billing
          <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
            Save up to 17%
          </Badge>
        </button>
      </div>
    </div>
  )
}