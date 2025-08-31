/**
 * Design System Preview Page
 * 
 * This page showcases the complete premium design system
 * Navigate to /design-system to view all components
 */

import { DesignSystemShowcase } from '@/components/ui/design-system-showcase'
import type { Metadata } from 'next/types'

export const metadata: Metadata = {
  title: 'Design System - TenantFlow',
  description: 'Premium SaaS design system components and patterns',
  robots: 'noindex, nofollow', // Prevent indexing of this internal page
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <DesignSystemShowcase />
    </div>
  )
}