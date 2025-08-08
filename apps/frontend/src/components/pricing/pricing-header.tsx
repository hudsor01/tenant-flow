interface PricingHeaderProps {
  className?: string
}

/**
 * Server component for pricing page header
 * Static content - no interactivity needed
 */
export function PricingHeader({ className }: PricingHeaderProps) {
  return (
    <div className={`text-center mb-12 ${className || ''}`}>
      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        Choose Your Perfect Plan
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Streamline your property management with TenantFlow. All plans include our core features with different limits to match your portfolio size.
      </p>
    </div>
  )
}