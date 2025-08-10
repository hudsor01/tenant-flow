import type { Metadata } from 'next/types'

export const metadata: Metadata = {
  title: 'Pricing - TenantFlow',
  description: 'Choose the perfect plan for your property management needs.',
}

export default function PricingPage() {
  return (
    <div>
      <h1>Pricing Page</h1>
      <p>This is a minimal pricing page</p>
    </div>
  )
}