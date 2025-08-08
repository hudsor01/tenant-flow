import { Check } from 'lucide-react'

interface TrustBadgesProps {
  className?: string
}

/**
 * Server component for trust badges section
 * Static content - no interactivity needed
 */
export function TrustBadges({ className }: TrustBadgesProps) {
  const badges = [
    'No setup fees',
    'Cancel anytime', 
    'Secure payment via Stripe',
    '24/7 support on Pro plans'
  ]

  return (
    <div className={`mt-16 text-center ${className || ''}`}>
      <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground">
        {badges.map((badge, index) => (
          <div key={index} className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            <span>{badge}</span>
          </div>
        ))}
      </div>
    </div>
  )
}