import { Separator } from '@/components/ui/separator'
import { Check } from 'lucide-react'

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
          <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-500" />
          </div>
          <span className="text-sm">Instant activation</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Check className="h-4 w-4 text-blue-500" />
          </div>
          <span className="text-sm">No setup fees</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Check className="h-4 w-4 text-purple-500" />
          </div>
          <span className="text-sm">Cancel anytime</span>
        </div>
      </div>
    </div>
  )
}