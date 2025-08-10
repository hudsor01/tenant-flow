import { Separator } from '@/components/ui/separator'
import { Check } from 'lucide-react'
import { StatusIcon } from '@/components/common/icon-container'

interface TrustBadgesProps {
  className?: string
}

/**
 * Server component for trust badges
 * Static content - no interactivity needed
 */
export function TrustBadges({ className }: TrustBadgesProps) {
  return (
    <div className={`mt-20 text-center ${className || ''}`}>
      <div className="inline-flex items-center gap-8 p-6 rounded-2xl bg-muted/50">
        <div className="flex items-center gap-2">
          <StatusIcon status="success" size="sm">
            <Check className="h-4 w-4" />
          </StatusIcon>
          <span className="text-sm">Instant activation</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <StatusIcon status="info" size="sm">
            <Check className="h-4 w-4" />
          </StatusIcon>
          <span className="text-sm">No setup fees</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <StatusIcon status="info" size="sm">
            <Check className="h-4 w-4" />
          </StatusIcon>
          <span className="text-sm">Cancel anytime</span>
        </div>
      </div>
    </div>
  )
}